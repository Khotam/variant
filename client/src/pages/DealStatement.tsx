import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDealStatement } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatusBadge } from '../components/ui/Badge';

interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
}

interface StatementInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: string;
}

interface StatementData {
  generatedAt: string;
  customer: { fullName: string; phonePrimary: string };
  productName: string;
  sellingPrice: number;
  advancePayment: number;
  monthlyInstallment: number;
  installmentMonths: number;
  startDate: string;
  status: string;
  installments: StatementInstallment[];
  totalDue: number;
  totalPaid: number;
  totalReceived: number;
  remaining: number;
}

export function StatementModal({ isOpen, onClose, dealId }: StatementModalProps) {
  const { t } = useTranslation();

  const { data: statement, isLoading } = useQuery({
    queryKey: ['statement', dealId],
    queryFn: () => getDealStatement(dealId),
    enabled: isOpen && !!dealId,
  });

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl my-4">
        {/* Screen-only toolbar */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{t('statement.title')}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {t('statement.print')}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('statement.close')}
            </button>
          </div>
        </div>

        <div className="p-8" id="statement-content">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">{t('common.loading')}</div>
          ) : !statement ? (
            <div className="text-center py-8 text-red-500">{t('common.error')}</div>
          ) : (
            <StatementContent statement={statement} t={t} />
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #statement-content, #statement-content * { visibility: visible; }
          #statement-content { position: fixed; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

function StatementContent({
  statement,
  t,
}: {
  statement: StatementData;
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-indigo-700">{t('statement.businessName')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('statement.title')}</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>{t('statement.generatedOn')}</p>
          <p className="font-medium text-slate-700">{formatDate(statement.generatedAt)}</p>
        </div>
      </div>

      {/* Customer & Product Info */}
      <div className="grid grid-cols-2 gap-6 rounded-lg bg-slate-50 p-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            {t('statement.customer')}
          </p>
          <p className="font-semibold text-slate-800">{statement.customer.fullName}</p>
          <p className="text-sm text-slate-600">{statement.customer.phonePrimary}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            {t('statement.product')}
          </p>
          <p className="font-semibold text-slate-800">{statement.productName}</p>
        </div>
      </div>

      {/* Deal Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">{t('statement.sellingPrice')}</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(statement.sellingPrice)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">{t('statement.advancePayment')}</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(statement.advancePayment)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">{t('statement.monthlyInstallment')}</p>
          <p className="text-lg font-bold text-indigo-700">{formatCurrency(statement.monthlyInstallment)}</p>
        </div>
      </div>

      <div className="text-center text-sm text-slate-500">
        {t('statement.installmentPeriod')}: <span className="font-medium text-slate-700">
          {statement.installmentMonths} {t('statement.months')}
        </span>
        {' | '}
        Start: <span className="font-medium text-slate-700">{formatDate(statement.startDate)}</span>
      </div>

      {/* Payment Schedule */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          {t('statement.paymentSchedule')}
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-indigo-50">
              <th className="border border-indigo-100 px-3 py-2 text-left font-medium text-indigo-700">
                {t('statement.no')}
              </th>
              <th className="border border-indigo-100 px-3 py-2 text-left font-medium text-indigo-700">
                {t('statement.dueDate')}
              </th>
              <th className="border border-indigo-100 px-3 py-2 text-right font-medium text-indigo-700">
                {t('statement.amountDue')}
              </th>
              <th className="border border-indigo-100 px-3 py-2 text-right font-medium text-indigo-700">
                {t('statement.amountPaid')}
              </th>
              <th className="border border-indigo-100 px-3 py-2 text-center font-medium text-indigo-700">
                {t('statement.status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {statement.installments.map((inst, idx) => (
              <tr key={inst.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-100 px-3 py-2 text-slate-600">
                  {inst.installmentNumber}
                </td>
                <td className="border border-slate-100 px-3 py-2 text-slate-600">
                  {formatDate(inst.dueDate)}
                </td>
                <td className="border border-slate-100 px-3 py-2 text-right font-medium">
                  {formatCurrency(inst.amountDue)}
                </td>
                <td className="border border-slate-100 px-3 py-2 text-right text-green-600">
                  {Number(inst.amountPaid) > 0 ? formatCurrency(inst.amountPaid) : '—'}
                </td>
                <td className="border border-slate-100 px-3 py-2 text-center">
                  <StatusBadge status={inst.status} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold">
              <td colSpan={2} className="border border-slate-200 px-3 py-2 text-slate-700">
                {t('statement.totalDue')}
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right text-slate-800">
                {formatCurrency(statement.totalDue)}
              </td>
              <td className="border border-slate-200 px-3 py-2 text-right text-green-700">
                {formatCurrency(statement.totalPaid)}
              </td>
              <td className="border border-slate-200 px-3 py-2"></td>
            </tr>
            <tr className="bg-amber-50">
              <td colSpan={4} className="border border-amber-100 px-3 py-2 text-amber-800 font-semibold">
                {t('statement.remainingBalance')}
              </td>
              <td className="border border-amber-100 px-3 py-2 text-right text-amber-800 font-bold">
                {formatCurrency(statement.remaining)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
