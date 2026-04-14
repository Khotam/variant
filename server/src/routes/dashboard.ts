import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [deals, users, settlements, upcomingInstallments, overdueInstallments] =
      await Promise.all([
        prisma.deal.findMany({
          include: {
            installments: true,
            investments: {
              include: { investor: { select: { id: true, displayName: true } } },
            },
          },
        }),
        prisma.user.findMany({ select: { id: true, displayName: true } }),
        prisma.debtSettlement.findMany({
          include: {
            payer: { select: { id: true, displayName: true } },
            payee: { select: { id: true, displayName: true } },
          },
        }),
        prisma.installment.findMany({
          where: {
            dueDate: { gte: today, lte: thirtyDaysFromNow },
            status: { in: ['PENDING', 'PARTIAL'] },
          },
          include: {
            deal: {
              include: {
                customer: { select: { fullName: true, phonePrimary: true } },
              },
            },
          },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.installment.findMany({
          where: {
            dueDate: { lt: today },
            status: { in: ['PENDING', 'PARTIAL'] },
          },
          include: {
            deal: {
              include: {
                customer: { select: { fullName: true, phonePrimary: true } },
              },
            },
          },
          orderBy: { dueDate: 'asc' },
        }),
      ]);

    const activeDeals = deals.filter((d) => d.status === 'ACTIVE');
    const settledDeals = deals.filter((d) => d.status === 'SETTLED');

    const totalInvested = activeDeals.reduce(
      (sum, d) =>
        sum +
        d.investments.reduce((s, i) => s + Number(i.actualContribution), 0),
      0
    );
    const totalExpectedReturn = activeDeals.reduce(
      (sum, d) => sum + Number(d.sellingPrice),
      0
    );
    const totalReceived = deals.reduce((sum, d) => {
      const installmentPaid = d.installments.reduce(
        (s, i) => s + Number(i.amountPaid),
        0
      );
      return sum + installmentPaid + Number(d.advancePayment);
    }, 0);

    const totalOutstanding = activeDeals.reduce((sum, d) => {
      const installmentPaid = d.installments.reduce(
        (s, i) => s + Number(i.amountPaid),
        0
      );
      const received = installmentPaid + Number(d.advancePayment);
      return sum + Math.max(0, Number(d.sellingPrice) - received);
    }, 0);

    const investorSummary = users.map((user) => {
      const userDeals = deals.filter((d) =>
        d.investments.some((i) => i.investorId === user.id)
      );

      const totalContributed = userDeals.reduce((sum, d) => {
        const inv = d.investments.find((i) => i.investorId === user.id);
        return sum + (inv ? parseFloat(inv.actualContribution.toString()) : 0);
      }, 0);

      // Expected investment contribution (cost/2 per deal, not selling price)
      const totalExpectedContribution = userDeals.reduce((sum, d) => {
        const inv = d.investments.find((i) => i.investorId === user.id);
        return sum + (inv ? parseFloat(inv.expectedContribution.toString()) : 0);
      }, 0);

      const totalExpected = userDeals.reduce(
        (sum, d) => sum + parseFloat(d.sellingPrice.toString()) / 2,
        0
      );

      const totalReceived50 = userDeals.reduce((sum, d) => {
        const installmentPaid = d.installments.reduce(
          (s, i) => s + parseFloat(i.amountPaid.toString()),
          0
        );
        const received = installmentPaid + parseFloat(d.advancePayment.toString());
        return sum + received / 2;
      }, 0);

      // grossDebt > 0: under-contributed (owes the other investor)
      // grossDebt < 0: over-contributed (owed by the other investor)
      const grossDebt = userDeals.reduce((sum, d) => {
        const inv = d.investments.find((i) => i.investorId === user.id);
        if (!inv) return sum;
        const val = parseFloat(inv.debtAmount.toString());
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      return {
        userId: user.id,
        displayName: user.displayName,
        totalContributed,
        totalExpectedContribution,
        totalExpected,
        totalReceived: totalReceived50,
        pendingReturn: Math.max(0, totalExpected - totalReceived50),
        grossDebt,
      };
    });

    let netDebt = { fromId: '', fromName: '', toId: '', toName: '', amount: 0 };
    let debtBreakdown = {
      u1Id: '', u1Name: '', u2Id: '', u2Name: '',
      u1RawDealDebt: 0,   // positive = u1 owes u2 from deals; negative = u2 owes u1 from deals
      settlementsU1toU2: 0,
      settlementsU2toU1: 0,
      net: 0,             // positive = u1 owes u2 net; negative = u2 owes u1 net
    };

    if (users.length >= 2) {
      const [u1, u2] = users;

      const grossDebtU1 = investorSummary.find((s) => s.userId === u1.id)?.grossDebt ?? 0;

      const settlementsU1toU2 = settlements
        .filter((s) => s.payerId === u1.id && s.payeeId === u2.id)
        .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);

      const settlementsU2toU1 = settlements
        .filter((s) => s.payerId === u2.id && s.payeeId === u1.id)
        .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);

      // Positive = u1 still owes u2 net; negative = u2 owes u1 net
      const net = grossDebtU1 - settlementsU1toU2 + settlementsU2toU1;

      debtBreakdown = {
        u1Id: u1.id, u1Name: u1.displayName,
        u2Id: u2.id, u2Name: u2.displayName,
        u1RawDealDebt: Math.round(grossDebtU1 * 100) / 100,
        settlementsU1toU2: Math.round(settlementsU1toU2 * 100) / 100,
        settlementsU2toU1: Math.round(settlementsU2toU1 * 100) / 100,
        net: Math.round(net * 100) / 100,
      };

      if (net > 0.005) {
        netDebt = { fromId: u1.id, fromName: u1.displayName, toId: u2.id, toName: u2.displayName, amount: Math.round(net * 100) / 100 };
      } else if (net < -0.005) {
        netDebt = { fromId: u2.id, fromName: u2.displayName, toId: u1.id, toName: u1.displayName, amount: Math.round(-net * 100) / 100 };
      }
    }

    res.json({
      totalInvested,
      totalExpectedReturn,
      totalReceived,
      totalOutstanding,
      activeDeals: activeDeals.length,
      settledDeals: settledDeals.length,
      overdueCount: overdueInstallments.length,
      upcomingPayments: upcomingInstallments.map((i) => ({
        id: i.id,
        dealId: i.dealId,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        amountDue: i.amountDue,
        amountPaid: i.amountPaid,
        status: i.status,
        customerName: i.deal.customer.fullName,
        productName: i.deal.productName,
        customerPhone: i.deal.customer.phonePrimary,
      })),
      overduePayments: overdueInstallments.map((i) => ({
        id: i.id,
        dealId: i.dealId,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        amountDue: i.amountDue,
        amountPaid: i.amountPaid,
        daysOverdue: Math.floor(
          (today.getTime() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
        customerName: i.deal.customer.fullName,
        productName: i.deal.productName,
        customerPhone: i.deal.customer.phonePrimary,
      })),
      investorSummary,
      netDebt,
      debtBreakdown,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
