import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { getDeals } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface Deal {
  id: string;
  customer: { id: string; fullName: string; phonePrimary: string };
  productName: string;
  cost: number;
  sellingPrice: number;
  markupPercent: number;
  advancePayment: number;
  monthlyInstallment: number;
  startDate: string;
  status: string;
  totalReceived: number;
  remaining: number;
}

export function Deals() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', statusFilter, search],
    queryFn: () =>
        getDeals({
          status: statusFilter || undefined,
          search: search || undefined,
        }),
  });

  const totals = useMemo(
      () =>
          deals.reduce(
              (acc: { received: number; remaining: number }, deal: Deal) => ({
                received: acc.received + Number(deal.totalReceived || 0),
                remaining: acc.remaining + Number(deal.remaining || 0),
              }),
              { received: 0, remaining: 0 }
          ),
      [deals]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('deals.title')}</h1>
        <Link to="/deals/new">
          <Button>
            <PlusIcon className="h-4 w-4" />
            {t('deals.newDeal')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('deals.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">{t('deals.allStatuses')}</option>
          <option value="ACTIVE">{t('status.ACTIVE')}</option>
          <option value="SETTLED">{t('status.SETTLED')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('deals.customer')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('deals.product')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('deals.cost')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('deals.sellingPrice')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('deals.advance')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('dealDetail.markupPercent')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('deals.monthly')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('deals.startDate')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('deals.received')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('deals.remaining')}</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">{t('deals.status')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-400">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-400">
                    {t('deals.noDeals')}
                  </td>
                </tr>
              ) : (
                deals.map((deal: Deal) => (
                  <tr key={deal.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
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
                    <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(deal.cost)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(deal.sellingPrice)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(deal.advancePayment)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{Number(deal.markupPercent).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(deal.monthlyInstallment)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(deal.startDate)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(deal.totalReceived)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{formatCurrency(deal.remaining)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={deal.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
              {!isLoading && deals.length > 0 && (
                  <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-4 py-3 text-slate-700" colSpan={8}>
                      {t('deals.total')}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">{formatCurrency(totals.received)}</td>
                    <td className="px-4 py-3 text-right text-amber-700">{formatCurrency(totals.remaining)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                  </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
  );
}
