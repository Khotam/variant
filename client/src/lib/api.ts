import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('variant_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('variant_token');
      localStorage.removeItem('variant_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const getMe = () =>
  api.get('/auth/me').then((r) => r.data);

// Customers
export const getCustomers = (search?: string) =>
  api.get('/customers', { params: search ? { search } : {} }).then((r) => r.data);

export const createCustomer = (data: {
  fullName: string;
  phonePrimary: string;
  phoneSecondary?: string;
  address?: string;
  notes?: string;
}) => api.post('/customers', data).then((r) => r.data);

export const getCustomer = (id: string) =>
  api.get(`/customers/${id}`).then((r) => r.data);

export const updateCustomer = (
  id: string,
  data: {
    fullName: string;
    phonePrimary: string;
    phoneSecondary?: string;
    address?: string;
    notes?: string;
  }
) => api.put(`/customers/${id}`, data).then((r) => r.data);

// Deals
export const getDeals = (params?: { status?: string; search?: string }) =>
  api.get('/deals', { params }).then((r) => r.data);

export const createDeal = (data: unknown) =>
  api.post('/deals', data).then((r) => r.data);

export const getDeal = (id: string) =>
  api.get(`/deals/${id}`).then((r) => r.data);

export const updateDeal = (id: string, data: unknown) =>
  api.put(`/deals/${id}`, data).then((r) => r.data);

export const getDealStatement = (id: string) =>
  api.get(`/deals/${id}/statement`).then((r) => r.data);

// Payments
export const createPayment = (data: {
  dealId: string;
  installmentId: string;
  amount: number;
  paymentDate: string;
  notes?: string;
}) => api.post('/payments', data).then((r) => r.data);

export const updatePayment = (
  id: string,
  data: { amount?: number; paymentDate?: string; notes?: string }
) => api.put(`/payments/${id}`, data).then((r) => r.data);

export const deletePayment = (id: string) =>
  api.delete(`/payments/${id}`).then((r) => r.data);

// Settlements
export const getSettlements = () =>
  api.get('/settlements').then((r) => r.data);

export const createSettlement = (data: {
  payerId: string;
  payeeId: string;
  amount: number;
  settlementDate: string;
  notes?: string;
}) => api.post('/settlements', data).then((r) => r.data);

export const updateSettlement = (
  id: string,
  data: { amount?: number; settlementDate?: string; notes?: string }
) => api.put(`/settlements/${id}`, data).then((r) => r.data);

export const deleteSettlement = (id: string) =>
  api.delete(`/settlements/${id}`).then((r) => r.data);

// Dashboard
export const getDashboard = () =>
  api.get('/dashboard').then((r) => r.data);

// Uploads
export const getPresignedUrl = (folder: string, contentType: string) =>
  api.post('/uploads/presign', { folder, contentType }).then((r) => r.data);

export const uploadToS3 = (url: string, file: File) =>
  axios.put(url, file, { headers: { 'Content-Type': file.type } });
