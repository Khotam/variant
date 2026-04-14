import { Router, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function recalculateInstallmentAndDeal(
  dealId: string,
  installmentId: string
): Promise<void> {
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: { payments: true },
  });

  if (!installment) return;

  const totalPaid = installment.payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  let status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'MISSED' = 'PENDING';
  const amountDue = Number(installment.amountDue);

  if (installment.status === 'MISSED') {
    status = 'MISSED';
  } else if (totalPaid >= amountDue) {
    status = 'PAID';
  } else if (totalPaid > 0) {
    status = 'PARTIAL';
  } else {
    status = 'PENDING';
  }

  await prisma.installment.update({
    where: { id: installmentId },
    data: {
      amountPaid: new Decimal(totalPaid),
      status,
    },
  });

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { installments: true },
  });

  if (!deal) return;

  const totalInstallmentsPaid = deal.installments.reduce(
    (sum, i) => sum + Number(i.amountPaid),
    0
  );
  const totalReceived = totalInstallmentsPaid + Number(deal.advancePayment);

  if (totalReceived >= Number(deal.sellingPrice)) {
    await prisma.deal.update({
      where: { id: dealId },
      data: { status: 'SETTLED' },
    });
  } else if (deal.status === 'SETTLED') {
    await prisma.deal.update({
      where: { id: dealId },
      data: { status: 'ACTIVE' },
    });
  }
}

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { dealId, installmentId, amount, paymentDate, notes } = req.body;

  if (!dealId || !installmentId || !amount || !paymentDate) {
    res.status(400).json({ error: 'dealId, installmentId, amount, and paymentDate are required' });
    return;
  }

  try {
    const amountNum = Number(amount);
    if (amountNum <= 0) {
      res.status(400).json({ error: 'Amount must be positive' });
      return;
    }

    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
    });

    if (!installment) {
      res.status(404).json({ error: 'Installment not found' });
      return;
    }

    const amountDue = Number(installment.amountDue);
    const alreadyPaid = Number(installment.amountPaid);
    const remaining = amountDue - alreadyPaid;
    const overflow = amountNum - remaining;

    const payment = await prisma.payment.create({
      data: {
        dealId,
        installmentId,
        amount: new Decimal(Math.min(amountNum, remaining > 0 ? amountNum : amountNum)),
        paymentDate: new Date(paymentDate),
        recordedById: req.userId!,
        notes,
      },
      include: {
        installment: true,
        recordedBy: { select: { id: true, displayName: true } },
      },
    });

    await recalculateInstallmentAndDeal(dealId, installmentId);

    if (overflow > 0) {
      const nextInstallment = await prisma.installment.findFirst({
        where: {
          dealId,
          status: { in: ['PENDING', 'PARTIAL'] },
          installmentNumber: { gt: installment.installmentNumber },
        },
        orderBy: { installmentNumber: 'asc' },
      });

      if (nextInstallment) {
        await prisma.payment.create({
          data: {
            dealId,
            installmentId: nextInstallment.id,
            amount: new Decimal(overflow),
            paymentDate: new Date(paymentDate),
            recordedById: req.userId!,
            notes: notes ? `${notes} (overflow)` : 'Overflow from previous installment',
          },
        });

        await recalculateInstallmentAndDeal(dealId, nextInstallment.id);
      }
    }

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amount, paymentDate, notes } = req.body;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount: new Decimal(Number(amount)) } : {}),
        ...(paymentDate !== undefined ? { paymentDate: new Date(paymentDate) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        installment: true,
        recordedBy: { select: { id: true, displayName: true } },
      },
    });

    await recalculateInstallmentAndDeal(payment.dealId, payment.installmentId);

    res.json(updated);
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const payment = await prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const { dealId, installmentId } = payment;

    await prisma.payment.delete({ where: { id } });

    const remaining = await prisma.payment.findMany({
      where: { installmentId },
    });

    const totalPaid = remaining.reduce((sum, p) => sum + Number(p.amount), 0);
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
    });

    if (installment) {
      const amountDue = Number(installment.amountDue);
      let status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'MISSED' = 'PENDING';
      if (installment.status === 'MISSED') {
        status = 'MISSED';
      } else if (totalPaid >= amountDue) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PARTIAL';
      }

      await prisma.installment.update({
        where: { id: installmentId },
        data: { amountPaid: new Decimal(totalPaid), status },
      });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { installments: true },
    });

    if (deal) {
      const totalInstallmentsPaid = deal.installments.reduce(
        (sum, i) => sum + Number(i.amountPaid),
        0
      );
      const totalReceived =
        (installment ? totalPaid : 0) + totalInstallmentsPaid + Number(deal.advancePayment);

      if (totalReceived < Number(deal.sellingPrice) && deal.status === 'SETTLED') {
        await prisma.deal.update({
          where: { id: dealId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
