import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { getCustomers, createCustomer, updateCustomer } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

interface CustomerFormData {
  fullName: string;
  phonePrimary: string;
  phoneSecondary: string;
  address: string;
  notes: string;
}

const defaultForm: CustomerFormData = {
  fullName: '',
  phonePrimary: '',
  phoneSecondary: '',
  address: '',
  notes: '',
};

interface Customer {
  id: string;
  fullName: string;
  phonePrimary: string;
  phoneSecondary?: string;
  address?: string;
  notes?: string;
  activeDeals: number;
  totalOutstanding: number;
}

export function Customers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormData>(defaultForm);
  const [formError, setFormError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getCustomers(search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (data.duplicatePhoneWarning) {
        setDuplicateWarning(data.duplicatePhoneWarning);
      } else {
        closeModal();
      }
    },
    onError: () => setFormError(t('common.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CustomerFormData }) =>
      updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      closeModal();
    },
    onError: () => setFormError(t('common.error')),
  });

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(defaultForm);
    setFormError('');
    setDuplicateWarning('');
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      fullName: customer.fullName,
      phonePrimary: customer.phonePrimary,
      phoneSecondary: customer.phoneSecondary || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setFormError('');
    setDuplicateWarning('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setDuplicateWarning('');
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.fullName.trim() || !form.phonePrimary.trim()) {
      setFormError('Full name and primary phone are required');
      return;
    }
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('customers.title')}</h1>
        <Button onClick={openCreate} size="md">
          <PlusIcon className="h-4 w-4" />
          {t('customers.addCustomer')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('customers.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('customers.name')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('customers.phone')}</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">{t('customers.activeDeals')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('customers.outstanding')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('customers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    {t('customers.noCustomers')}
                  </td>
                </tr>
              ) : (
                customers.map((c: Customer) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/customers/${c.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {c.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.phonePrimary}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                        {c.activeDeals}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(c.totalOutstanding)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/customers/${c.id}`}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                        >
                          {t('customers.viewDetails')}
                        </Link>
                        <button
                          onClick={() => openEdit(c)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          {duplicateWarning && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              {duplicateWarning}
            </div>
          )}

          <Input
            label={t('customers.fullName')}
            placeholder={t('customers.fullNamePlaceholder')}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            label={t('customers.phonePrimary')}
            placeholder={t('customers.phonePrimaryPlaceholder')}
            value={form.phonePrimary}
            onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })}
            required
          />
          <Input
            label={t('customers.phoneSecondary')}
            placeholder={t('customers.phoneSecondaryPlaceholder')}
            value={form.phoneSecondary}
            onChange={(e) => setForm({ ...form, phoneSecondary: e.target.value })}
          />
          <Input
            label={t('customers.address')}
            placeholder={t('customers.addressPlaceholder')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Textarea
            label={t('customers.notes')}
            placeholder={t('customers.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              loading={isMutating}
              className="flex-1"
            >
              {t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={isMutating}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
