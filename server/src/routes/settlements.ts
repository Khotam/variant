import { Router, Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settlements = await prisma.debtSettlement.findMany({
      include: {
        payer: { select: { id: true, displayName: true } },
        payee: { select: { id: true, displayName: true } },
        recordedBy: { select: { id: true, displayName: true } },
      },
      orderBy: { settlementDate: 'desc' },
    });

    res.json(settlements);
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { payerId, payeeId, amount, settlementDate, notes } = req.body;

  if (!payerId || !payeeId || !amount || !settlementDate) {
    res.status(400).json({ error: 'payerId, payeeId, amount, and settlementDate are required' });
    return;
  }

  if (payerId === payeeId) {
    res.status(400).json({ error: 'Payer and payee must be different' });
    return;
  }

  try {
    const settlement = await prisma.debtSettlement.create({
      data: {
        payerId,
        payeeId,
        amount: new Decimal(Number(amount)),
        settlementDate: new Date(settlementDate),
        notes,
        recordedById: req.userId!,
      },
      include: {
        payer: { select: { id: true, displayName: true } },
        payee: { select: { id: true, displayName: true } },
        recordedBy: { select: { id: true, displayName: true } },
      },
    });

    res.status(201).json(settlement);
  } catch (error) {
    console.error('Create settlement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { amount, settlementDate, notes } = req.body;

  try {
    const settlement = await prisma.debtSettlement.findUnique({ where: { id } });

    if (!settlement) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    const updated = await prisma.debtSettlement.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount: new Decimal(Number(amount)) } : {}),
        ...(settlementDate !== undefined ? { settlementDate: new Date(settlementDate) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        payer: { select: { id: true, displayName: true } },
        payee: { select: { id: true, displayName: true } },
        recordedBy: { select: { id: true, displayName: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update settlement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const settlement = await prisma.debtSettlement.findUnique({ where: { id } });

    if (!settlement) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    await prisma.debtSettlement.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete settlement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
