export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(
  dateStr: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatDateInput(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

export function daysOverdue(dueDateStr: string | Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function generateInstallmentPreview(
  sellingPrice: number,
  advancePayment: number,
  installmentMonths: number,
  startDate: Date
): Array<{ installmentNumber: number; dueDate: Date; amountDue: number }> {
  if (!sellingPrice || !installmentMonths || installmentMonths <= 0) return [];

  const totalRemaining = sellingPrice - advancePayment;
  const base = Math.floor((totalRemaining / installmentMonths) * 100) / 100;
  const schedule = [];

  let allocated = 0;
  for (let i = 1; i <= installmentMonths; i++) {
    const isLast = i === installmentMonths;
    const amountDue = isLast
      ? Math.round((totalRemaining - allocated) * 100) / 100
      : base;
    allocated += amountDue;
    schedule.push({
      installmentNumber: i,
      dueDate: addMonths(startDate, i),
      amountDue,
    });
  }

  return schedule;
}

export function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'bg-indigo-100 text-indigo-700';
    case 'SETTLED':
      return 'bg-green-100 text-green-700';
    case 'PAID':
      return 'bg-green-100 text-green-700';
    case 'PENDING':
      return 'bg-slate-100 text-slate-600';
    case 'PARTIAL':
      return 'bg-amber-100 text-amber-700';
    case 'OVERDUE':
      return 'bg-red-100 text-red-700';
    case 'MISSED':
      return 'bg-red-200 text-red-800';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}
