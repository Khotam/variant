import { Router, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function generateInstallmentSchedule(
  sellingPrice: number,
  advancePayment: number,
  installmentMonths: number,
  startDate: Date
): Array<{ installmentNumber: number; dueDate: Date; amountDue: number }> {
  const totalRemaining = sellingPrice - advancePayment;
  const base = Math.floor((totalRemaining / installmentMonths) * 100) / 100;
  const schedule = [];

  let allocated = 0;
  for (let i = 1; i <= installmentMonths; i++) {
    const isLast = i === installmentMonths;
    const amountDue = isLast
      ? Math.round((totalRemaining - allocated) * 100) / 100
      : base;
    allocated += amountDue;
    schedule.push({
      installmentNumber: i,
      dueDate: addMonths(startDate, i),
      amountDue,
    });
  }

  return schedule;
}

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, search } = req.query;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deals = await prisma.deal.findMany({
      where: {
        ...(status ? { status: String(status).toUpperCase() as 'ACTIVE' | 'SETTLED' } : {}),
        ...(search
          ? {
              OR: [
                { productName: { contains: String(search), mode: 'insensitive' } },
                { customer: { fullName: { contains: String(search), mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, fullName: true, phonePrimary: true } },
        installments: true,
        investments: {
          include: { investor: { select: { id: true, displayName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = deals.map((deal) => {
      const totalPaid = deal.installments.reduce(
        (sum, i) => sum + Number(i.amountPaid),
        0
      );
      const totalReceived = totalPaid + Number(deal.advancePayment);
      const remaining = Number(deal.sellingPrice) - totalReceived;

      return {
        id: deal.id,
        customer: deal.customer,
        productName: deal.productName,
        cost: deal.cost,
        sellingPrice: deal.sellingPrice,
        markupAmount: deal.markupAmount,
        markupPercent: deal.markupPercent,
        advancePayment: deal.advancePayment,
        installmentMonths: deal.installmentMonths,
        monthlyInstallment: deal.monthlyInstallment,
        startDate: deal.startDate,
        storeName: deal.storeName,
        status: deal.status,
        createdAt: deal.createdAt,
        totalReceived,
        remaining: Math.max(0, remaining),
        investments: deal.investments,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    customerId,
    productName,
    cost,
    sellingPrice,
    advancePayment = 0,
    installmentMonths,
    startDate,
    storeName,
    productPhotoUrl,
    receiptPhotoUrl,
    notes,
    investments,
  } = req.body;

  if (!customerId || !productName || !cost || !sellingPrice || !installmentMonths || !startDate) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  if (!investments || !Array.isArray(investments) || investments.length === 0) {
    res.status(400).json({ error: 'Investor contributions are required' });
    return;
  }

  try {
    const costNum = Number(cost);
    const sellingPriceNum = Number(sellingPrice);
    const advanceNum = Number(advancePayment);
    const monthsNum = Number(installmentMonths);

    const markupAmount = sellingPriceNum - costNum;
    const markupPercent = (markupAmount / costNum) * 100;
    const monthlyInstallment =
      Math.floor(((sellingPriceNum - advanceNum) / monthsNum) * 100) / 100;

    const parsedStartDate = new Date(startDate);
    const schedule = generateInstallmentSchedule(
      sellingPriceNum,
      advanceNum,
      monthsNum,
      parsedStartDate
    );

    const deal = await prisma.deal.create({
      data: {
        customerId,
        productName,
        cost: new Decimal(costNum),
        sellingPrice: new Decimal(sellingPriceNum),
        markupAmount: new Decimal(markupAmount),
        markupPercent: new Decimal(markupPercent),
        advancePayment: new Decimal(advanceNum),
        installmentMonths: monthsNum,
        monthlyInstallment: new Decimal(monthlyInstallment),
        startDate: parsedStartDate,
        storeName,
        productPhotoUrl,
        receiptPhotoUrl,
        notes,
        createdById: req.userId!,
        investments: {
          create: investments.map((inv: { investorId: string; actualContribution: number }) => {
            const expectedContribution = costNum / investments.length;
            const actualContribution = Number(inv.actualContribution);
            const debtAmount = expectedContribution - actualContribution;
            return {
              investorId: inv.investorId,
              expectedContribution: new Decimal(expectedContribution),
              actualContribution: new Decimal(actualContribution),
              debtAmount: new Decimal(debtAmount),
            };
          }),
        },
        installments: {
          create: schedule.map((s) => ({
            installmentNumber: s.installmentNumber,
            dueDate: s.dueDate,
            amountDue: new Decimal(s.amountDue),
            amountPaid: new Decimal(0),
            status: 'PENDING',
          })),
        },
      },
      include: {
        customer: true,
        investments: {
          include: { investor: { select: { id: true, displayName: true } } },
        },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    res.status(201).json(deal);
  } catch (error) {
    console.error('Create deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, displayName: true } },
        investments: {
          include: { investor: { select: { id: true, displayName: true } } },
        },
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: {
          include: {
            recordedBy: { select: { id: true, displayName: true } },
            installment: true,
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const installments = deal.installments.map((i) => ({
      ...i,
      status:
        i.status === 'MISSED'
          ? 'MISSED'
          : new Date(i.dueDate) < today &&
            (i.status === 'PENDING' || i.status === 'PARTIAL')
          ? 'OVERDUE'
          : i.status,
    }));

    const totalPaid = deal.installments.reduce(
      (sum, i) => sum + Number(i.amountPaid),
      0
    );
    const totalReceived = totalPaid + Number(deal.advancePayment);
    const remaining = Number(deal.sellingPrice) - totalReceived;

    res.json({
      ...deal,
      installments,
      totalReceived,
      remaining: Math.max(0, remaining),
    });
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { storeName, productPhotoUrl, receiptPhotoUrl, notes } = req.body;

  try {
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const hasPayments = deal.payments.length > 0;

    const updateData: Record<string, unknown> = {
      storeName,
      productPhotoUrl,
      receiptPhotoUrl,
      notes,
    };

    if (!hasPayments) {
      const {
        productName,
        cost,
        sellingPrice,
        advancePayment,
        installmentMonths,
        startDate,
      } = req.body;

      if (productName) updateData.productName = productName;
      if (cost !== undefined) {
        const costNum = Number(cost);
        const sellingPriceNum = sellingPrice ? Number(sellingPrice) : Number(deal.sellingPrice);
        const markupAmount = sellingPriceNum - costNum;
        const markupPercent = (markupAmount / costNum) * 100;
        updateData.cost = new Decimal(costNum);
        updateData.markupAmount = new Decimal(markupAmount);
        updateData.markupPercent = new Decimal(markupPercent);
      }
      if (sellingPrice !== undefined) {
        updateData.sellingPrice = new Decimal(Number(sellingPrice));
      }
      if (advancePayment !== undefined) {
        updateData.advancePayment = new Decimal(Number(advancePayment));
      }
      if (installmentMonths !== undefined) {
        updateData.installmentMonths = Number(installmentMonths);
      }
      if (startDate !== undefined) {
        updateData.startDate = new Date(startDate);
      }
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        investments: {
          include: { investor: { select: { id: true, displayName: true } } },
        },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/statement', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        customer: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const totalPaid = deal.installments.reduce(
      (sum, i) => sum + Number(i.amountPaid),
      0
    );
    const totalReceived = totalPaid + Number(deal.advancePayment);
    const remaining = Number(deal.sellingPrice) - totalReceived;

    const installments = deal.installments.map((i) => ({
      id: i.id,
      installmentNumber: i.installmentNumber,
      dueDate: i.dueDate,
      amountDue: i.amountDue,
      amountPaid: i.amountPaid,
      status:
        i.status === 'MISSED'
          ? 'MISSED'
          : new Date(i.dueDate) < today &&
            (i.status === 'PENDING' || i.status === 'PARTIAL')
          ? 'OVERDUE'
          : i.status,
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      customer: {
        fullName: deal.customer.fullName,
        phonePrimary: deal.customer.phonePrimary,
      },
      productName: deal.productName,
      sellingPrice: deal.sellingPrice,
      advancePayment: deal.advancePayment,
      monthlyInstallment: deal.monthlyInstallment,
      installmentMonths: deal.installmentMonths,
      startDate: deal.startDate,
      status: deal.status,
      installments,
      totalDue: Number(deal.sellingPrice) - Number(deal.advancePayment),
      totalPaid,
      totalReceived,
      remaining: Math.max(0, remaining),
    });
  } catch (error) {
    console.error('Get statement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
