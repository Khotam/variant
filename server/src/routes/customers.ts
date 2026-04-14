import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { search } = req.query;

  try {
    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { fullName: { contains: String(search), mode: 'insensitive' } },
              { phonePrimary: { contains: String(search) } },
              { phoneSecondary: { contains: String(search) } },
            ],
          }
        : undefined,
      include: {
        deals: {
          include: {
            installments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = customers.map((c) => {
      const activeDeals = c.deals.filter((d) => d.status === 'ACTIVE').length;
      const totalOutstanding = c.deals.reduce((sum, deal) => {
        const paid = deal.installments.reduce(
          (s, i) => s + Number(i.amountPaid),
          0
        );
        const remaining = Number(deal.sellingPrice) - Number(deal.advancePayment) - paid;
        return sum + Math.max(0, remaining);
      }, 0);

      return {
        id: c.id,
        fullName: c.fullName,
        phonePrimary: c.phonePrimary,
        phoneSecondary: c.phoneSecondary,
        address: c.address,
        notes: c.notes,
        createdAt: c.createdAt,
        activeDeals,
        totalOutstanding,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { fullName, phonePrimary, phoneSecondary, address, notes } = req.body;

  if (!fullName || !phonePrimary) {
    res.status(400).json({ error: 'Full name and primary phone are required' });
    return;
  }

  try {
    const existing = await prisma.customer.findFirst({
      where: {
        OR: [
          { phonePrimary },
          ...(phoneSecondary ? [{ phoneSecondary }] : []),
        ],
      },
    });

    const customer = await prisma.customer.create({
      data: { fullName, phonePrimary, phoneSecondary, address, notes },
    });

    res.status(201).json({
      ...customer,
      duplicatePhoneWarning: existing
        ? `Phone number may already exist for customer: ${existing.fullName}`
        : undefined,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        deals: {
          include: {
            installments: {
              orderBy: { installmentNumber: 'asc' },
            },
            payments: {
              orderBy: { paymentDate: 'desc' },
            },
            investments: {
              include: { investor: { select: { id: true, displayName: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deals = customer.deals.map((deal) => {
      const totalPaid = deal.installments.reduce(
        (sum, i) => sum + Number(i.amountPaid),
        0
      );
      const totalDue = Number(deal.sellingPrice) - Number(deal.advancePayment);
      const remaining = totalDue - totalPaid;

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

      return {
        id: deal.id,
        productName: deal.productName,
        cost: deal.cost,
        sellingPrice: deal.sellingPrice,
        advancePayment: deal.advancePayment,
        monthlyInstallment: deal.monthlyInstallment,
        installmentMonths: deal.installmentMonths,
        startDate: deal.startDate,
        status: deal.status,
        storeName: deal.storeName,
        notes: deal.notes,
        totalPaid: totalPaid + Number(deal.advancePayment),
        remaining: Math.max(0, remaining),
        installments,
        payments: deal.payments,
        investments: deal.investments,
      };
    });

    const totalPaid = deals.reduce((sum, d) => sum + d.totalPaid, 0);
    const totalRemaining = deals.reduce((sum, d) => sum + d.remaining, 0);

    res.json({
      id: customer.id,
      fullName: customer.fullName,
      phonePrimary: customer.phonePrimary,
      phoneSecondary: customer.phoneSecondary,
      address: customer.address,
      notes: customer.notes,
      createdAt: customer.createdAt,
      deals,
      totalPaid,
      totalRemaining,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { fullName, phonePrimary, phoneSecondary, address, notes } = req.body;

  if (!fullName || !phonePrimary) {
    res.status(400).json({ error: 'Full name and primary phone are required' });
    return;
  }

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: { fullName, phonePrimary, phoneSecondary, address, notes },
    });

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
