import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckIcon } from '@heroicons/react/24/outline';
import { getCustomers, createCustomer, createDeal, getPresignedUrl, uploadToS3, getMe } from '../lib/api';
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  generateInstallmentPreview,
} from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';

interface CustomerOption {
  id: string;
  fullName: string;
  phonePrimary: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
}

const STEPS = 4;

export function NewDeal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);

  // Step 1 — Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    fullName: '',
    phonePrimary: '',
    phoneSecondary: '',
    address: '',
    notes: '',
  });

  // Step 2 — Product
  const [productName, setProductName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null);
  const [receiptPhotoFile, setReceiptPhotoFile] = useState<File | null>(null);
  const [productPhotoKey, setProductPhotoKey] = useState('');
  const [receiptPhotoKey, setReceiptPhotoKey] = useState('');
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Step 3 — Deal Terms
  const [cost, setCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [advancePayment, setAdvancePayment] = useState('0');
  const [installmentMonths, setInstallmentMonths] = useState('12');
  const [startDate, setStartDate] = useState(formatDateInput(new Date()));
  const [dealNotes, setDealNotes] = useState('');

  // Step 4 — Investments
  const [investments, setInvestments] = useState<Record<string, { cash: string; reinvested: string }>>({});
  const [businessPool, setBusinessPool] = useState(0);

  const [stepError, setStepError] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => getCustomers(customerSearch || undefined),
    enabled: customerSearch.length >= 1 || !creatingCustomer,
  });

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['customers', ''],
    queryFn: () => getCustomers(''),
    select: () => [],
    enabled: false,
  });

  // Fetch all users for investment step
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('variant_token')}`,
      },
    })
      .then((r) => r.json())
      .then(() => {
        // We need all users. Let's get them from the investments section differently.
        // Since there's no /api/users endpoint, we'll use the dashboard data to find all users.
        fetch('/api/dashboard', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('variant_token')}`,
          },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.investorSummary) {
              const u: User[] = data.investorSummary.map((s: {
                userId: string;
                displayName: string;
              }) => ({
                id: s.userId,
                username: s.displayName.toLowerCase(),
                displayName: s.displayName,
              }));
              setUsers(u);
              const initial: Record<string, { cash: string; reinvested: string }> = {};
              u.forEach((usr) => { initial[usr.id] = { cash: '', reinvested: '0' }; });
              setInvestments(initial);
              if (data.businessPool !== undefined) {
                setBusinessPool(data.businessPool);
              }
            }
          });
      });
  }, []);

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data: CustomerOption) => {
      setSelectedCustomer(data);
      setCreatingCustomer(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: createDeal,
    onSuccess: (data: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/deals/${data.id}`);
    },
    onError: () => setStepError(t('common.error')),
  });

  const costNum = parseFloat(cost) || 0;
  const sellingPriceNum = parseFloat(sellingPrice) || 0;
  const advanceNum = parseFloat(advancePayment) || 0;
  const monthsNum = parseInt(installmentMonths) || 1;

  const markupAmount = sellingPriceNum - costNum;
  const netCost = costNum - advanceNum;
  const markupPercent = netCost > 0 ? ((sellingPriceNum - advanceNum) / netCost - 1) * 100 : 0;
  const monthlyInstallment =
    sellingPriceNum > 0 && monthsNum > 0
      ? (sellingPriceNum - advanceNum) / monthsNum
      : 0;

  const schedule = generateInstallmentPreview(
    sellingPriceNum,
    advanceNum,
    monthsNum,
    startDate ? new Date(startDate) : new Date()
  );

  const totalInvestments = Object.values(investments).reduce(
    (sum, v) => sum + (parseFloat(v.cash) || 0) + (parseFloat(v.reinvested) || 0),
    0
  );
  const totalReinvested = Object.values(investments).reduce(
    (sum, v) => sum + (parseFloat(v.reinvested) || 0),
    0
  );

  const handleUploadFile = async (
    file: File,
    folder: 'products' | 'receipts',
    setKey: (k: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const { url, key } = await getPresignedUrl(folder, file.type);
      await uploadToS3(url, file);
      setKey(key);
    } catch {
      alert('Upload failed. Please check S3 configuration.');
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async () => {
    setStepError('');

    if (step === 1) {
      if (!selectedCustomer) {
        if (creatingCustomer) {
          if (!newCustomer.fullName || !newCustomer.phonePrimary) {
            setStepError('Full name and phone are required');
            return;
          }
          createCustomerMutation.mutate(newCustomer);
          return;
        }
        setStepError('Please select or create a customer');
        return;
      }
    }

    if (step === 2) {
      if (!productName.trim()) {
        setStepError('Product name is required');
        return;
      }
    }

    if (step === 3) {
      if (!cost || !sellingPrice || !installmentMonths || !startDate) {
        setStepError('Cost, selling price, months, and start date are required');
        return;
      }
      if (sellingPriceNum <= 0 || costNum <= 0) {
        setStepError('Cost and selling price must be positive');
        return;
      }
    }

    if (step < STEPS) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    setStepError('');

    const invArray = users.map((u) => {
      const cash = parseFloat(investments[u.id]?.cash || '0');
      const reinvested = parseFloat(investments[u.id]?.reinvested || '0');
      return {
        investorId: u.id,
        actualContribution: cash + reinvested,
        reinvestedAmount: reinvested,
      };
    });

    const totalContrib = invArray.reduce((s, i) => s + i.actualContribution, 0);
    if (Math.abs(totalContrib - costNum) > 0.01) {
      setStepError(`Total contributions (${formatCurrency(totalContrib)}) must equal cost (${formatCurrency(costNum)})`);
      return;
    }

    createDealMutation.mutate({
      customerId: selectedCustomer!.id,
      productName,
      storeName,
      productPhotoUrl: productPhotoKey || undefined,
      receiptPhotoUrl: receiptPhotoKey || undefined,
      cost: costNum,
      sellingPrice: sellingPriceNum,
      advancePayment: advanceNum,
      installmentMonths: monthsNum,
      startDate,
      notes: dealNotes || undefined,
      investments: invArray,
    });
  };

  const stepLabels = [
    t('newDeal.step1'),
    t('newDeal.step2'),
    t('newDeal.step3'),
    t('newDeal.step4'),
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{t('newDeal.title')}</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-0">
        {stepLabels.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = step > stepNum;
          const isCurrent = step === stepNum;
          return (
            <div key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 ${
                    isCompleted
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : isCurrent
                      ? 'border-indigo-600 text-indigo-600 bg-white'
                      : 'border-slate-300 text-slate-400 bg-white'
                  }`}
                >
                  {isCompleted ? <CheckIcon className="h-4 w-4" /> : stepNum}
                </div>
                <span
                  className={`mt-1 text-xs font-medium ${
                    isCurrent ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < STEPS - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-12px] ${
                    step > stepNum ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {stepError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {stepError}
          </div>
        )}

        {/* Step 1 — Customer */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">{t('newDeal.step1')}</h2>

            {!creatingCustomer ? (
              <>
                <Input
                  label={t('newDeal.searchCustomer')}
                  placeholder={t('newDeal.searchCustomer')}
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setSelectedCustomer(null);
                  }}
                />

                {customerSearch && (
                  <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {(customers as CustomerOption[]).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch(c.fullName);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          selectedCustomer?.id === c.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <p className="font-medium text-slate-800">{c.fullName}</p>
                        <p className="text-xs text-slate-500">{c.phonePrimary}</p>
                      </button>
                    ))}
                    {customers.length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-400">No customers found</p>
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2">
                    <p className="text-sm font-medium text-indigo-800">
                      {selectedCustomer.fullName}
                    </p>
                    <p className="text-xs text-indigo-600">{selectedCustomer.phonePrimary}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCreatingCustomer(true)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {t('newDeal.orCreateNew')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-sm font-medium text-slate-700">New Customer</h3>
                <Input
                  label={t('customers.fullName')}
                  value={newCustomer.fullName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, fullName: e.target.value })}
                  required
                />
                <Input
                  label={t('customers.phonePrimary')}
                  value={newCustomer.phonePrimary}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phonePrimary: e.target.value })}
                  required
                />
                <Input
                  label={t('customers.phoneSecondary')}
                  value={newCustomer.phoneSecondary}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phoneSecondary: e.target.value })}
                />
                <Input
                  label={t('customers.address')}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatingCustomer(false)}
                    className="text-sm text-slate-500 hover:underline"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2 — Product */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">{t('newDeal.step2')}</h2>

            <Input
              label={t('newDeal.productName')}
              placeholder={t('newDeal.productNamePlaceholder')}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <Input
              label={t('newDeal.storeName')}
              placeholder={t('newDeal.storeNamePlaceholder')}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />

            {/* Product Photo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('newDeal.productPhoto')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setProductPhotoFile(f);
                      handleUploadFile(f, 'products', setProductPhotoKey, setUploadingProduct);
                    }
                  }}
                  className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadingProduct && <span className="text-xs text-slate-400">Uploading...</span>}
                {productPhotoKey && !uploadingProduct && (
                  <span className="text-xs text-green-600">✓ Uploaded</span>
                )}
              </div>
            </div>

            {/* Receipt Photo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('newDeal.receiptPhoto')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setReceiptPhotoFile(f);
                      handleUploadFile(f, 'receipts', setReceiptPhotoKey, setUploadingReceipt);
                    }
                  }}
                  className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {uploadingReceipt && <span className="text-xs text-slate-400">Uploading...</span>}
                {receiptPhotoKey && !uploadingReceipt && (
                  <span className="text-xs text-green-600">✓ Uploaded</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Deal Terms */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">{t('newDeal.step3')}</h2>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('newDeal.cost')}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
              <Input
                label={t('newDeal.advancePayment')}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value)}
              />
            </div>

            <Input
              label={t('newDeal.sellingPrice')}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('newDeal.installmentMonths')}
                type="number"
                min="1"
                max="60"
                placeholder="12"
                value={installmentMonths}
                onChange={(e) => setInstallmentMonths(e.target.value)}
                required
              />
              <Input
                label={t('newDeal.startDate')}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            {/* Quick month buttons */}
            <div className="flex gap-2 flex-wrap">
              {[3, 6, 9, 12, 18, 24].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setInstallmentMonths(String(m))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    installmentMonths === String(m)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>

            {/* Live Calculations */}
            {sellingPriceNum > 0 && costNum > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">{t('newDeal.markupAmount')}</p>
                    <p className={`font-semibold ${markupAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(markupAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('newDeal.markupPercent')}</p>
                    <p className={`font-semibold ${markupPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {markupPercent.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('newDeal.monthlyInstallment')}</p>
                    <p className="font-semibold text-indigo-600">{formatCurrency(monthlyInstallment)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Preview */}
            {schedule.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  {t('newDeal.previewSchedule')}
                </h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-3 py-2 font-medium text-slate-500">#</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-500">Due Date</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((s) => (
                        <tr key={s.installmentNumber} className="border-b border-slate-50">
                          <td className="px-3 py-1.5 text-slate-600">{s.installmentNumber}</td>
                          <td className="px-3 py-1.5 text-slate-600">{formatDate(s.dueDate)}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(s.amountDue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Textarea
              label={t('customers.notes')}
              placeholder={t('customers.notesPlaceholder')}
              value={dealNotes}
              onChange={(e) => setDealNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Step 4 — Investments */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">{t('newDeal.step4')}</h2>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {t('newDeal.cost')}: <span className="font-semibold">{formatCurrency(costNum)}</span>
                {' — '}{t('newDeal.expectedContribution')}:{' '}
                <span className="font-semibold">
                  {formatCurrency(users.length > 0 ? costNum / users.length : 0)}
                </span>
              </p>
              {businessPool > 0 && (
                <span className="text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-2 py-1">
                  {t('newDeal.poolAvailable')}: {formatCurrency(businessPool)}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {users.map((user) => {
                const cash = parseFloat(investments[user.id]?.cash || '0');
                const reinvested = parseFloat(investments[user.id]?.reinvested || '0');
                const actual = cash + reinvested;
                const expected = users.length > 0 ? costNum / users.length : 0;
                const shortfall = expected - actual;

                return (
                  <div key={user.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                          {user.displayName[0]}
                        </div>
                        <span className="font-medium text-slate-800">{user.displayName}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {t('newDeal.expectedContribution')}: {formatCurrency(expected)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label={t('newDeal.cashContribution')}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={investments[user.id]?.cash || ''}
                        onChange={(e) =>
                          setInvestments({
                            ...investments,
                            [user.id]: { ...investments[user.id], cash: e.target.value },
                          })
                        }
                      />
                      <Input
                        label={t('newDeal.reinvestedAmount')}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={investments[user.id]?.reinvested || ''}
                        onChange={(e) =>
                          setInvestments({
                            ...investments,
                            [user.id]: { ...investments[user.id], reinvested: e.target.value },
                          })
                        }
                      />
                    </div>
                    {actual > 0 && (
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Total: <span className="font-semibold text-slate-700">{formatCurrency(actual)}</span>
                        </span>
                        {Math.abs(shortfall) > 0.01 && (
                          <span className={shortfall > 0 ? 'text-red-500' : 'text-green-500'}>
                            {shortfall > 0
                              ? `${t('newDeal.shortfall')}: ${formatCurrency(shortfall)}`
                              : `Over: ${formatCurrency(Math.abs(shortfall))}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total check */}
            <div
              className={`rounded-lg border p-3 text-sm ${
                Math.abs(totalInvestments - costNum) < 0.01
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>
                  {t('newDeal.totalContributions')}: {formatCurrency(totalInvestments)} / {t('newDeal.mustEqualCost')}: {formatCurrency(costNum)}
                </span>
                {totalReinvested > 0 && (
                  <span className="text-xs text-cyan-700 font-medium">
                    {t('newDeal.reinvestedAmount')}: {formatCurrency(totalReinvested)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => { setStep(step - 1); setStepError(''); }}
          >
            {t('newDeal.back')}
          </Button>
        )}
        <div className="flex-1" />
        {step < STEPS ? (
          <Button
            type="button"
            onClick={handleNext}
            loading={createCustomerMutation.isPending}
          >
            {t('newDeal.next')}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            loading={createDealMutation.isPending}
          >
            {t('newDeal.submit')}
          </Button>
        )}
      </div>
    </div>
  );
}
