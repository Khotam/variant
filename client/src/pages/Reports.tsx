import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getDeals, getDashboard } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatusBadge } from '../components/ui/Badge';

type Tab = 'profitability' | 'overdue' | 'investors';

interface Deal {
  id: string;
  customer: { id: string; fullName: string; phonePrimary: string };
  productName: string;
  cost: number;
  sellingPrice: number;
  markupAmount: number;
  markupPercent: number;
  status: string;
  totalReceived: number;
  remaining: number;
}

export function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('profitability');

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', '', ''],
    queryFn: () => getDeals(),
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profitability', label: t('reports.dealProfitability') },
    { key: 'overdue', label: t('reports.overduePayments') },
    { key: 'investors', label: t('reports.investorSummary') },
  ];

  const overdueList = dashboard?.overduePayments || [];

  const profitCollected = (deal: Deal) => {
    const costProportion = Number(deal.cost) / Number(deal.sellingPrice);
    return Number(deal.totalReceived) - Number(deal.totalReceived) * costProportion;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t('reports.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deal Profitability */}
      {activeTab === 'profitability' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t('reports.customer')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t('reports.product')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t('reports.cost')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t('reports.sellingPrice')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t('reports.markup')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t('reports.markupPercent')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">{t('reports.status')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t('reports.collected')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t('reports.profitCollected')}</th>
                </tr>
              </thead>
              <tbody>
                {dealsLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">{t('common.loading')}</td>
                  </tr>
                ) : deals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">{t('reports.noData')}</td>
                  </tr>
                ) : (
                  deals.map((deal: Deal) => (
                    <tr key={deal.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link to={`/customers/${deal.customer.id}`} className="text-indigo-600 hover:underline text-xs">
                          {deal.customer.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/deals/${deal.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                          {deal.productName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(deal.cost)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(deal.sellingPrice)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {formatCurrency(deal.markupAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {Number(deal.markupPercent).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={deal.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(deal.totalReceived)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {formatCurrency(profitCollected(deal))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {deals.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-slate-700">{t('common.total')}</td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(deals.reduce((s: number, d: Deal) => s + Number(d.cost), 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(deals.reduce((s: number, d: Deal) => s + Number(d.sellingPrice), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      {formatCurrency(deals.reduce((s: number, d: Deal) => s + Number(d.markupAmount), 0))}
                    </td>
                    <td colSpan={2} className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(deals.reduce((s: number, d: Deal) => s + Number(d.totalReceived), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      {formatCurrency(deals.reduce((s: number, d: Deal) => s + profitCollected(d), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Overdue Payments */}
      {activeTab === 'overdue' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t('reports.customer')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t('reports.phone')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t('reports.product')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">{t('reports.installmentNo')}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">{t('reports.dueDate')}</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">{t('reports.daysOverdue')}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">{t('reports.amountDue')}</th>
                </tr>
              </thead>
              <tbody>
                {dashLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">{t('common.loading')}</td>
                  </tr>
                ) : overdueList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">{t('reports.noData')}</td>
                  </tr>
                ) : (
                  [...overdueList]
                    .sort((a: { daysOverdue: number }, b: { daysOverdue: number }) => b.daysOverdue - a.daysOverdue)
                    .map((item: {
                      id: string;
                      dealId: string;
                      customerName: string;
                      customerPhone: string;
                      productName: string;
                      installmentNumber: number;
                      dueDate: string;
                      daysOverdue: number;
                      amountDue: number;
                      amountPaid: number;
                    }) => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-red-50">
                        <td className="px-4 py-3">
                          <Link to={`/deals/${item.dealId}`} className="font-medium text-red-600 hover:underline">
                            {item.customerName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{item.customerPhone}</td>
                        <td className="px-4 py-3 text-slate-600">{item.productName}</td>
                        <td className="px-4 py-3 text-center text-slate-600">#{item.installmentNumber}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(item.dueDate)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {item.daysOverdue}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-700">
                          {formatCurrency(Number(item.amountDue) - Number(item.amountPaid))}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investor Summary */}
      {activeTab === 'investors' && (
        <div className="space-y-4">
          {dashLoading ? (
            <p className="text-slate-400">{t('common.loading')}</p>
          ) : !dashboard?.investorSummary?.length ? (
            <p className="text-slate-400">{t('reports.noData')}</p>
          ) : (
            dashboard.investorSummary.map((inv: {
              userId: string;
              displayName: string;
              totalContributed: number;
              totalExpected: number;
              totalReceived: number;
              pendingReturn: number;
            }) => (
              <div key={inv.userId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-base font-bold text-indigo-700">
                    {inv.displayName[0]}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">{inv.displayName}</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t('reports.totalContributed')}</p>
                    <p className="text-base font-bold text-slate-800">{formatCurrency(inv.totalContributed)}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-xs text-slate-500">{t('reports.totalExpected')}</p>
                    <p className="text-base font-bold text-green-700">{formatCurrency(inv.totalExpected)}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 p-3">
                    <p className="text-xs text-slate-500">{t('reports.totalReceived')}</p>
                    <p className="text-base font-bold text-indigo-700">{formatCurrency(inv.totalReceived)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs text-slate-500">{t('reports.pendingReturn')}</p>
                    <p className="text-base font-bold text-amber-700">{formatCurrency(inv.pendingReturn)}</p>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Net Debt Summary */}
          {dashboard?.netDebt && dashboard.netDebt.amount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-base font-semibold text-amber-800 mb-2">
                {t('settlements.netDebt')}
              </h3>
              <p className="text-sm text-amber-700">
                <span className="font-bold">{dashboard.netDebt.fromName}</span>{' '}
                {t('dashboard.owes')}{' '}
                <span className="font-bold">{dashboard.netDebt.toName}</span>{': '}
                <span className="text-lg font-bold">{formatCurrency(dashboard.netDebt.amount)}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
