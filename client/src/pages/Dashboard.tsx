import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { getDashboard } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatCard } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';

export function Dashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t('dashboard.title')}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/*<StatCard*/}
        {/*  title={t('dashboard.totalInvested')}*/}
        {/*  value={formatCurrency(data?.totalInvested)}*/}
        {/*  icon={<BanknotesIcon className="h-5 w-5" />}*/}
        {/*  color="indigo"*/}
        {/*/>*/}
        {/*<StatCard*/}
        {/*  title={t('dashboard.totalExpectedReturn')}*/}
        {/*  value={formatCurrency(data?.totalExpectedReturn)}*/}
        {/*  icon={<ArrowTrendingUpIcon className="h-5 w-5" />}*/}
        {/*  color="green"*/}
        {/*/>*/}
        {/*<StatCard*/}
        {/*  title={t('dashboard.totalReceived')}*/}
        {/*  value={formatCurrency(data?.totalReceived)}*/}
        {/*  icon={<CheckCircleIcon className="h-5 w-5" />}*/}
        {/*  color="green"*/}
        {/*/>*/}
        <StatCard
          title={t('dashboard.totalOutstanding')}
          value={formatCurrency(data?.totalOutstanding)}
          icon={<ExclamationCircleIcon className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
            title={t('dashboard.businessPool')}
            value={formatCurrency(data?.businessPool ?? 0)}
            icon={<ArrowPathIcon className="h-5 w-5" />}
            color="indigo"
            subtitle={data?.totalReinvested > 0 ? `${formatCurrency(data.totalReinvested)} reinvested` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t('dashboard.activeDeals')}
          value={data?.activeDeals ?? 0}
          icon={<DocumentTextIcon className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title={t('dashboard.settledDeals')}
          value={data?.settledDeals ?? 0}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title={t('dashboard.overdueInstallments')}
          value={data?.overdueCount ?? 0}
          icon={<ClockIcon className="h-5 w-5" />}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investor Debt Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-800">
            {t('dashboard.investorDebtSummary')}
          </h2>

          {/* Net result */}
          {data?.netDebt?.amount > 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">
                <span>{data.netDebt.fromName}</span>
                {' '}{t('dashboard.owes')}{' '}
                <span>{data.netDebt.toName}</span>
                {' '}<span className="text-base text-amber-700">{formatCurrency(data.netDebt.amount)}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm text-green-700">{t('dashboard.debtCleared')}</p>
            </div>
          )}


          {/* Profit summary per investor */}
          {data?.investorSummary && data.investorSummary.length > 0 && (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Profit share (50/50)</p>
              {data.investorSummary.map((inv: {
                userId: string;
                displayName: string;
                totalExpected: number;
                totalReceived: number;
                pendingReturn: number;
              }) => (
                <div key={inv.userId} className="flex items-center justify-between text-sm">
                  <p className="font-medium text-slate-800">{inv.displayName}</p>
                  <div className="text-right">
                    <p className="text-green-600 font-medium">{formatCurrency(inv.totalReceived)} received</p>
                    <p className="text-xs text-slate-400">+{formatCurrency(inv.pendingReturn)} pending</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Payments */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            {t('dashboard.overduePayments')}
          </h2>
          {!data?.overduePayments?.length ? (
            <p className="text-sm text-slate-400">{t('dashboard.noOverdue')}</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.overduePayments.slice(0, 8).map((item: {
                id: string;
                dealId: string;
                installmentNumber: number;
                dueDate: string;
                amountDue: number;
                amountPaid: number;
                daysOverdue: number;
                customerName: string;
                productName: string;
                customerPhone: string;
              }) => (
                <Link
                  key={item.id}
                  to={`/deals/${item.dealId}`}
                  className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-3 py-2 hover:bg-red-100 transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-red-800">{item.customerName}</p>
                    <p className="text-xs text-red-600">{item.productName} — #{item.installmentNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-700">
                      {formatCurrency(Number(item.amountDue) - Number(item.amountPaid))}
                    </p>
                    <p className="text-xs text-red-400">{item.daysOverdue}d overdue</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Payments */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          {t('dashboard.upcomingPayments')}
        </h2>
        {!data?.upcomingPayments?.length ? (
          <p className="text-sm text-slate-400">{t('dashboard.noUpcoming')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 font-medium text-slate-500">Customer</th>
                  <th className="text-left py-2 font-medium text-slate-500">Product</th>
                  <th className="text-left py-2 font-medium text-slate-500">#</th>
                  <th className="text-left py-2 font-medium text-slate-500">Due Date</th>
                  <th className="text-right py-2 font-medium text-slate-500">Amount</th>
                  <th className="text-center py-2 font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.upcomingPayments.map((item: {
                  id: string;
                  dealId: string;
                  installmentNumber: number;
                  dueDate: string;
                  amountDue: number;
                  amountPaid: number;
                  status: string;
                  customerName: string;
                  productName: string;
                }) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2">
                      <Link to={`/deals/${item.dealId}`} className="font-medium text-indigo-600 hover:underline">
                        {item.customerName}
                      </Link>
                    </td>
                    <td className="py-2 text-slate-600">{item.productName}</td>
                    <td className="py-2 text-slate-600">#{item.installmentNumber}</td>
                    <td className="py-2 text-slate-600">{formatDate(item.dueDate)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.amountDue)}</td>
                    <td className="py-2 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
