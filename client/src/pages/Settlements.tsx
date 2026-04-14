import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getSettlements, createSettlement, updateSettlement, deleteSettlement, getDashboard } from '../lib/api';
import { formatCurrency, formatDate, formatDateInput } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal, ConfirmModal } from '../components/ui/Modal';

interface User {
  userId: string;
  displayName: string;
}

interface Settlement {
  id: string;
  payer: { id: string; displayName: string };
  payee: { id: string; displayName: string };
  amount: number;
  settlementDate: string;
  notes?: string;
}

export function Settlements() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSettlement, setEditSettlement] = useState<Settlement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState({
    payerId: '',
    payeeId: '',
    amount: '',
    settlementDate: formatDateInput(new Date()),
    notes: '',
  });
  const [formError, setFormError] = useState('');

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: getSettlements,
  });

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  useEffect(() => {
    if (dashboard?.investorSummary) {
      setUsers(dashboard.investorSummary as User[]);
      if (!form.payerId && dashboard.investorSummary.length >= 2) {
        setForm((f) => ({
          ...f,
          payerId: dashboard.investorSummary[0].userId,
          payeeId: dashboard.investorSummary[1].userId,
        }));
      }
    }
  }, [dashboard]);

  const createMutation = useMutation({
    mutationFn: createSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: () => setFormError(t('common.error')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount?: number; settlementDate?: string; notes?: string } }) =>
      updateSettlement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeModal();
    },
    onError: () => setFormError(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditSettlement(null);
    setForm({
      payerId: users[0]?.userId || '',
      payeeId: users[1]?.userId || '',
      amount: '',
      settlementDate: formatDateInput(new Date()),
      notes: '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (s: Settlement) => {
    setEditSettlement(s);
    setForm({
      payerId: s.payer.id,
      payeeId: s.payee.id,
      amount: String(s.amount),
      settlementDate: formatDateInput(s.settlementDate),
      notes: s.notes || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditSettlement(null);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setFormError('Amount must be positive');
      return;
    }
    if (form.payerId === form.payeeId) {
      setFormError('Payer and payee must be different');
      return;
    }
    if (editSettlement) {
      updateMutation.mutate({
        id: editSettlement.id,
        data: { amount: amt, settlementDate: form.settlementDate, notes: form.notes },
      });
    } else {
      createMutation.mutate({
        payerId: form.payerId,
        payeeId: form.payeeId,
        amount: amt,
        settlementDate: form.settlementDate,
        notes: form.notes || undefined,
      });
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('settlements.title')}</h1>
        <Button onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          {t('settlements.addSettlement')}
        </Button>
      </div>

      {/* Net Debt Summary */}
      {dashboard?.netDebt && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-3">{t('settlements.netDebt')}</h2>
          {dashboard.netDebt.amount > 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-800">
                <span className="font-bold">{dashboard.netDebt.fromName}</span>{' '}
                {t('dashboard.owes')}{' '}
                <span className="font-bold">{dashboard.netDebt.toName}</span>{': '}
                <span className="text-xl font-bold text-amber-700">
                  {formatCurrency(dashboard.netDebt.amount)}
                </span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-700">{t('dashboard.debtCleared')}</p>
            </div>
          )}
        </div>
      )}

      {/* Settlements Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('settlements.date')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('settlements.payer')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('settlements.payee')}</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">{t('settlements.amount')}</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">{t('settlements.notes')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">{t('common.loading')}</td>
                </tr>
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">{t('settlements.noSettlements')}</td>
                </tr>
              ) : (
                settlements.map((s: Settlement) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{formatDate(s.settlementDate)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.payer.displayName}</td>
                    <td className="px-4 py-3 text-slate-600">{s.payee.displayName}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      {formatCurrency(s.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{s.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editSettlement ? t('settlements.editSettlement') : t('settlements.addSettlement')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          {!editSettlement && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('settlements.payer')}
                </label>
                <select
                  value={form.payerId}
                  onChange={(e) => setForm({ ...form, payerId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  <option value="">{t('settlements.selectPayer')}</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>{u.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('settlements.payee')}
                </label>
                <select
                  value={form.payeeId}
                  onChange={(e) => setForm({ ...form, payeeId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  <option value="">{t('settlements.selectPayee')}</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>{u.displayName}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <Input
            label={t('settlements.amount')}
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <Input
            label={t('settlements.settlementDate')}
            type="date"
            value={form.settlementDate}
            onChange={(e) => setForm({ ...form, settlementDate: e.target.value })}
            required
          />
          <Textarea
            label={t('settlements.notes')}
            placeholder={t('settlements.notesPlaceholder')}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
          />

          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={isMutating} className="flex-1">
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

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={t('settlements.deleteSettlement')}
        message={t('settlements.confirmDelete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
