import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PrinterIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { getDeal, createPayment, updatePayment, deletePayment, updateDeal, deleteDeal } from '../lib/api';
import { formatCurrency, formatDate, formatDateInput } from '../lib/utils';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { StatementModal } from './DealStatement';

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  notes?: string;
  recordedBy: { displayName: string };
  installment: { installmentNumber: number };
}

export function DealDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [paymentModal, setPaymentModal] = useState<Installment | null>(null);
  const [editPaymentModal, setEditPaymentModal] = useState<Payment | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [editDealModal, setEditDealModal] = useState(false);
  const [deleteDealModal, setDeleteDealModal] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(formatDateInput(new Date()));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const [editForm, setEditForm] = useState({
    storeName: '',
    notes: '',
    productPhotoUrl: '',
    receiptPhotoUrl: '',
  });

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDeal(id!),
    enabled: !!id,
  });

  const createPaymentMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentError('');
    },
    onError: () => setPaymentError(t('common.error')),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ pid, data }: { pid: string; data: { amount?: number; paymentDate?: string; notes?: string } }) =>
      updatePayment(pid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditPaymentModal(null);
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeletePaymentId(null);
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: () => deleteDeal(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/deals');
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: (data: typeof editForm) => updateDeal(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      setEditDealModal(false);
    },
  });

  const markMissedMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      const res = await fetch(`/api/deals/${id}/installments/${installmentId}/missed`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('variant_token')}`,
        },
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deal', id] }),
  });

  const openEdit = () => {
    setEditForm({
      storeName: deal.storeName || '',
      notes: deal.notes || '',
      productPhotoUrl: deal.productPhotoUrl || '',
      receiptPhotoUrl: deal.receiptPhotoUrl || '',
    });
    setEditDealModal(true);
  };

  const handleRecordPayment = () => {
    if (!paymentModal) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Amount must be positive');
      return;
    }
    createPaymentMutation.mutate({
      dealId: id!,
      installmentId: paymentModal.id,
      amount: amt,
      paymentDate,
      notes: paymentNotes || undefined,
    });
  };

  const openPaymentModal = (installment: Installment) => {
    const remaining = Number(installment.amountDue) - Number(installment.amountPaid);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentDate(formatDateInput(new Date()));
    setPaymentNotes('');
    setPaymentError('');
    setPaymentModal(installment);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="text-center text-red-600 py-8">
        <p>{t('common.error')}</p>
        <Link to="/deals" className="text-indigo-600 text-sm block mt-2">
          {t('dealDetail.backToDeals')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/deals"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('dealDetail.backToDeals')}
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStatementOpen(true)}
          >
            <PrinterIcon className="h-4 w-4" />
            {t('dealDetail.printStatement')}
          </Button>
          <Button variant="secondary" size="sm" onClick={openEdit}>
            <PencilSquareIcon className="h-4 w-4" />
            {t('dealDetail.editDeal')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteDealModal(true)}>
            <TrashIcon className="h-4 w-4" />
            {t('dealDetail.deleteDeal')}
          </Button>
        </div>
      </div>

      {/* Deal Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{deal.productName}</h1>
              <StatusBadge status={deal.status} />
            </div>
            <Link
              to={`/customers/${deal.customer.id}`}
              className="text-indigo-600 hover:underline text-sm"
            >
              {deal.customer.fullName}
            </Link>
            {deal.storeName && (
              <p className="text-xs text-slate-400 mt-0.5">{deal.storeName}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">{t('deals.cost')}</p>
            <p className="font-semibold text-slate-800">{formatCurrency(deal.cost)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('deals.sellingPrice')}</p>
            <p className="font-semibold text-slate-800">{formatCurrency(deal.sellingPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('dealDetail.markupAmount')}</p>
            <p className="font-semibold text-green-600">{formatCurrency(deal.markupAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('dealDetail.markupPercent')}</p>
            <p className="font-semibold text-green-600">{Number(deal.markupPercent).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('deals.advance')}</p>
            <p className="font-semibold">{formatCurrency(deal.advancePayment)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('deals.monthly')}</p>
            <p className="font-semibold text-indigo-600">{formatCurrency(deal.monthlyInstallment)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('deals.startDate')}</p>
            <p className="font-semibold">{formatDate(deal.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('deals.received')}</p>
            <p className="font-semibold text-green-600">{formatCurrency(deal.totalReceived)}</p>
          </div>
        </div>

        {deal.remaining > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="text-sm text-amber-700 font-medium">
              {t('deals.remaining')}: {formatCurrency(deal.remaining)}
            </span>
          </div>
        )}

        {/* Photos */}
        {(deal.productPhotoUrl || deal.receiptPhotoUrl) && (
          <div className="mt-4 flex gap-4">
            {deal.productPhotoUrl && (
              <a
                href={`https://${process.env.AWS_BUCKET_NAME || 'variant-uploads'}.s3.amazonaws.com/${deal.productPhotoUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline"
              >
                {t('dealDetail.productPhoto')}
              </a>
            )}
            {deal.receiptPhotoUrl && (
              <a
                href={`https://${process.env.AWS_BUCKET_NAME || 'variant-uploads'}.s3.amazonaws.com/${deal.receiptPhotoUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline"
              >
                {t('dealDetail.receiptPhoto')}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Investor Contributions */}
      {deal.investments?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            {t('dealDetail.investorContributions')}
          </h2>
          <div className="space-y-2">
            {deal.investments.map((inv: {
              id: string;
              investor: { id: string; displayName: string };
              expectedContribution: number;
              actualContribution: number;
              reinvestedAmount: number;
              debtAmount: number;
            }) => {
              const reinvested = Number(inv.reinvestedAmount ?? 0);
              const cash = Number(inv.actualContribution) - reinvested;
              return (
                <div key={inv.id} className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-slate-800">{inv.investor.displayName}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        {t('dealDetail.expectedContribution')}: {formatCurrency(inv.expectedContribution)}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {t('dealDetail.actualContribution')}: {formatCurrency(inv.actualContribution)}
                      </span>
                      {Number(inv.debtAmount) !== 0 && (
                        <span className={Number(inv.debtAmount) > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {Number(inv.debtAmount) > 0
                            ? `Owes: ${formatCurrency(inv.debtAmount)}`
                            : `Over: ${formatCurrency(Math.abs(Number(inv.debtAmount)))}`}
                        </span>
                      )}
                    </div>
                  </div>
                  {reinvested > 0 && (
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{t('dealDetail.cashContribution')}: <span className="font-medium text-slate-700">{formatCurrency(cash)}</span></span>
                      <span className="text-cyan-600">+</span>
                      <span>{t('dealDetail.reinvestedAmount')}: <span className="font-medium text-cyan-700">{formatCurrency(reinvested)}</span></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Schedule */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {t('dealDetail.paymentSchedule')}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2 font-medium text-slate-500">#</th>
                <th className="text-left px-4 py-2 font-medium text-slate-500">{t('dealDetail.dueDate')}</th>
                <th className="text-right px-4 py-2 font-medium text-slate-500">{t('dealDetail.amountDue')}</th>
                <th className="text-right px-4 py-2 font-medium text-slate-500">{t('dealDetail.amountPaid')}</th>
                <th className="text-right px-4 py-2 font-medium text-slate-500">{t('dealDetail.balance')}</th>
                <th className="text-center px-4 py-2 font-medium text-slate-500">{t('deals.status')}</th>
                <th className="text-center px-4 py-2 font-medium text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {deal.installments?.map((inst: Installment) => {
                const balance = Number(inst.amountDue) - Number(inst.amountPaid);
                return (
                  <tr key={inst.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">#{inst.installmentNumber}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(inst.dueDate)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(inst.amountDue)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatCurrency(inst.amountPaid)}</td>
                    <td className="px-4 py-2 text-right text-amber-600">
                      {balance > 0 ? formatCurrency(balance) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={inst.status} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {inst.status !== 'PAID' && inst.status !== 'MISSED' && (
                        <button
                          onClick={() => openPaymentModal(inst)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          {t('dealDetail.recordPayment')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {t('dealDetail.paymentHistory')}
          </h2>
        </div>
        {!deal.payments?.length ? (
          <div className="px-5 py-6 text-center text-slate-400 text-sm">
            {t('dealDetail.noPayments')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2 font-medium text-slate-500">{t('dealDetail.paymentDate')}</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Installment</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">{t('dealDetail.amount')}</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">{t('dealDetail.recordedBy')}</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Notes</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {deal.payments.map((payment: Payment) => (
                  <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">{formatDate(payment.paymentDate)}</td>
                    <td className="px-4 py-2 text-slate-600">
                      #{payment.installment?.installmentNumber}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {payment.recordedBy?.displayName}
                    </td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{payment.notes || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditPaymentModal(payment)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletePaymentId(payment.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentModal}
        onClose={() => { setPaymentModal(null); setPaymentError(''); }}
        title={`${t('dealDetail.recordPayment')} — #${paymentModal?.installmentNumber}`}
      >
        <div className="space-y-4">
          {paymentError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {paymentError}
            </div>
          )}
          {paymentModal && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
              <p className="text-slate-600">
                Due: <span className="font-medium">{formatCurrency(paymentModal.amountDue)}</span>
                {' | '}
                Paid: <span className="font-medium text-green-600">{formatCurrency(paymentModal.amountPaid)}</span>
                {' | '}
                Balance: <span className="font-medium text-amber-600">
                  {formatCurrency(Number(paymentModal.amountDue) - Number(paymentModal.amountPaid))}
                </span>
              </p>
            </div>
          )}
          <Input
            label={t('payments.amount')}
            type="number"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />
          <Input
            label={t('payments.paymentDate')}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Textarea
            label={t('payments.notes')}
            placeholder={t('payments.notesPlaceholder')}
            value={paymentNotes}
            onChange={(e) => setPaymentNotes(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleRecordPayment}
              loading={createPaymentMutation.isPending}
              className="flex-1"
            >
              {t('payments.save')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setPaymentModal(null); setPaymentError(''); }}
              disabled={createPaymentMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Payment Modal */}
      {editPaymentModal && (
        <Modal
          isOpen={!!editPaymentModal}
          onClose={() => setEditPaymentModal(null)}
          title={t('payments.editPayment')}
        >
          <EditPaymentForm
            payment={editPaymentModal}
            onSave={(data) => updatePaymentMutation.mutate({ pid: editPaymentModal.id, data })}
            onClose={() => setEditPaymentModal(null)}
            loading={updatePaymentMutation.isPending}
            t={t}
          />
        </Modal>
      )}

      {/* Delete Payment Confirm */}
      <ConfirmModal
        isOpen={!!deletePaymentId}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={() => deletePaymentId && deletePaymentMutation.mutate(deletePaymentId)}
        title={t('payments.deletePayment')}
        message={t('payments.confirmDelete')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deletePaymentMutation.isPending}
      />

      {/* Edit Deal Modal */}
      <Modal
        isOpen={editDealModal}
        onClose={() => setEditDealModal(false)}
        title={t('dealDetail.editDeal')}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateDealMutation.mutate(editForm);
          }}
          className="space-y-4"
        >
          <Input
            label={t('dealDetail.storeName')}
            value={editForm.storeName}
            onChange={(e) => setEditForm({ ...editForm, storeName: e.target.value })}
          />
          <Textarea
            label={t('customers.notes')}
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            rows={3}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={updateDealMutation.isPending} className="flex-1">
              {t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditDealModal(false)}
              disabled={updateDealMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Deal Confirm */}
      <ConfirmModal
        isOpen={deleteDealModal}
        onClose={() => setDeleteDealModal(false)}
        onConfirm={() => deleteDealMutation.mutate()}
        title={t('dealDetail.deleteDeal')}
        message={
          deal?.payments?.length > 0
            ? t('dealDetail.confirmDeleteDealWithPayments')
            : t('dealDetail.confirmDeleteDeal')
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteDealMutation.isPending}
      />

      {/* Statement Modal */}
      <StatementModal
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        dealId={id!}
      />
    </div>
  );
}

function EditPaymentForm({
  payment,
  onSave,
  onClose,
  loading,
  t,
}: {
  payment: Payment;
  onSave: (data: { amount?: number; paymentDate?: string; notes?: string }) => void;
  onClose: () => void;
  loading: boolean;
  t: (key: string) => string;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [date, setDate] = useState(formatDateInput(payment.paymentDate));
  const [notes, setNotes] = useState(payment.notes || '');

  return (
    <div className="space-y-4">
      <Input
        label={t('payments.amount')}
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Input
        label={t('payments.paymentDate')}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Textarea
        label={t('payments.notes')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onSave({ amount: parseFloat(amount), paymentDate: date, notes })}
          loading={loading}
          className="flex-1"
        >
          {t('common.save')}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}
