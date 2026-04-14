import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { getCustomer, updateCustomer } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export function CustomerDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phonePrimary: '',
    phoneSecondary: '',
    address: '',
    notes: '',
  });

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof form) => updateCustomer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditOpen(false);
    },
  });

  const openEdit = () => {
    setForm({
      fullName: customer.fullName,
      phonePrimary: customer.phonePrimary,
      phoneSecondary: customer.phoneSecondary || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>{t('common.error')}</p>
        <Link to="/customers" className="text-indigo-600 text-sm mt-2 block">
          {t('customerDetail.backToCustomers')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/customers"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('customerDetail.backToCustomers')}
        </Link>
      </div>

      {/* Customer Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{customer.fullName}</h1>
            <p className="text-slate-500 mt-1">{customer.phonePrimary}</p>
            {customer.phoneSecondary && (
              <p className="text-slate-400 text-sm">{customer.phoneSecondary}</p>
            )}
            {customer.address && (
              <p className="text-slate-500 text-sm mt-1">{customer.address}</p>
            )}
            {customer.notes && (
              <p className="text-slate-400 text-sm mt-1 italic">{customer.notes}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              {t('customers.createdAt')}: {formatDate(customer.createdAt)}
            </p>
          </div>
          <button
            onClick={openEdit}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5"
          >
            <PencilSquareIcon className="h-4 w-4" />
            {t('common.edit')}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">{t('customerDetail.totalPaid')}</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(customer.totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('customerDetail.totalRemaining')}</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(customer.totalRemaining)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('customerDetail.deals')}</p>
            <p className="text-lg font-bold text-slate-700">{customer.deals?.length ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Deals */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          {t('customerDetail.dealHistory')}
        </h2>
        {!customer.deals?.length ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            {t('customerDetail.noDealFound')}
          </div>
        ) : (
          <div className="space-y-3">
            {customer.deals.map((deal: {
              id: string;
              productName: string;
              cost: number;
              sellingPrice: number;
              advancePayment: number;
              monthlyInstallment: number;
              installmentMonths: number;
              startDate: string;
              status: string;
              totalPaid: number;
              remaining: number;
            }) => (
              <div key={deal.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{deal.productName}</h3>
                      <StatusBadge status={deal.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('deals.startDate')}: {formatDate(deal.startDate)} —{' '}
                      {deal.installmentMonths} {t('common.months')}
                    </p>
                  </div>
                  <Link
                    to={`/deals/${deal.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 rounded-lg px-2 py-1"
                  >
                    {t('common.view')}
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">{t('deals.sellingPrice')}</p>
                    <p className="font-medium">{formatCurrency(deal.sellingPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('customerDetail.totalPaid')}</p>
                    <p className="font-medium text-green-600">{formatCurrency(deal.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('customerDetail.totalRemaining')}</p>
                    <p className="font-medium text-amber-600">{formatCurrency(deal.remaining)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('customers.editCustomer')}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(form);
          }}
          className="space-y-4"
        >
          <Input
            label={t('customers.fullName')}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            label={t('customers.phonePrimary')}
            value={form.phonePrimary}
            onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })}
            required
          />
          <Input
            label={t('customers.phoneSecondary')}
            value={form.phoneSecondary}
            onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })}
          />
          <Input
            label={t('customers.address')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Textarea
            label={t('customers.notes')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={updateMutation.isPending} className="flex-1">
              {t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditOpen(false)}
              disabled={updateMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
