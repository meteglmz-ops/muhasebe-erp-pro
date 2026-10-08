export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('erp_api_url');
    if (custom) return custom;
  }
  if ((import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  // In browser environment
  if (typeof window !== 'undefined') {
    // If running in development with Vite dev port (5173)
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:5000/api`;
    }
    // In production (single-domain cloud deploy like Render/Railway/Docker)
    if (window.location.origin) {
      return `${window.location.origin}/api`;
    }
  }
  return 'http://localhost:5000/api';
};

function toQueryString(params: Record<string, any> = {}): string {
  const clean: Record<string, string> = {};
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null') {
      clean[key] = String(val);
    }
  }
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
}

class ApiService {
  public setToken(token: string): void {
    localStorage.setItem('erp_token', token);
  }

  public clearToken(): void {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_company_id');
  }

  private getToken(): string | null {
    return localStorage.getItem('erp_token');
  }

  private getCompanyId(): string | null {
    return localStorage.getItem('erp_company_id');
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const companyId = this.getCompanyId();
    const baseUrl = getApiBaseUrl();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (companyId) {
      headers['x-company-id'] = companyId;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // Binary / File download
    if (response.headers.get('content-type')?.includes('application/pdf') ||
        response.headers.get('content-type')?.includes('spreadsheetml')) {
      return response.blob() as any;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'İşlem sırasında bir hata oluştu.');
    }

    return data;
  }

  // Auth & OTP
  async login(email: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(payload: { email: string; password: string; fullName: string; companyName: string; tcIdentity: string; taxNumber?: string; phone?: string }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async requestRegisterOtp(payload: { email: string; password: string; fullName: string; companyName: string; tcIdentity: string; taxNumber?: string; phone?: string }) {
    return this.request<any>('/auth/register/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyRegisterOtp(email: string, otp: string) {
    return this.request<any>('/auth/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async requestForgotPasswordOtp(email: string) {
    return this.request<any>('/auth/forgot-password/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(payload: { email: string; otp: string; newPassword: string }) {
    return this.request<any>('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Güvenlik & Şifre Değiştirme (Çok Katmanlı: Şifre + T.C. + E-Posta OTP)
  async requestChangePasswordOtp(payload: { currentPassword: string; tcIdentity: string }) {
    return this.request<any>('/auth/change-password/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async confirmChangePassword(payload: { code: string; newPassword: string; tcIdentity: string }) {
    return this.request<any>('/auth/change-password/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Kritik Veri / Fabrika Sıfırlaması (Çok Katmanlı Onay)
  async requestSystemResetOtp(payload?: { currentPassword?: string; tcIdentity?: string }) {
    return this.request<any>('/auth/reset-system/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  async confirmSystemReset(payload: { otp: string; currentPassword?: string; tcIdentity?: string; confirmWord?: string; keepMasterData?: boolean }) {
    return this.request<any>('/auth/reset-system/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getEmailLogs() {
    return this.request<any>('/auth/email-logs');
  }

  async getSmtpConfig() {
    return this.request<any>('/auth/email/smtp-config');
  }

  async saveSmtpConfig(config: any) {
    return this.request<any>('/auth/email/smtp-config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async testSendSmtp(recipient: string) {
    return this.request<any>('/auth/email/test-send', {
      method: 'POST',
      body: JSON.stringify({ recipient }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Companies
  async getCompanies() {
    return this.request<any>('/companies');
  }

  async getCurrentCompany() {
    return this.request<any>('/companies/current');
  }

  async createCompany(payload: any) {
    return this.request<any>('/companies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCurrentCompany(payload: any) {
    return this.request<any>('/companies/current', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Customers
  async getCustomers(params: { page?: number; limit?: number; search?: string } = {}) {
    return this.request<any>(`/customers${toQueryString(params)}`);
  }

  async getCustomer(id: string) {
    return this.request<any>(`/customers/${id}`);
  }

  async createCustomer(payload: any) {
    return this.request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCustomer(id: string, payload: any) {
    return this.request<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCustomer(id: string, payload?: { password?: string; confirmText?: string }) {
    return this.request<any>(`/customers/${id}`, {
      method: 'DELETE',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  }

  // Suppliers
  async getSuppliers(params: { page?: number; limit?: number; search?: string } = {}) {
    return this.request<any>(`/suppliers${toQueryString(params)}`);
  }

  async getSupplier(id: string) {
    return this.request<any>(`/suppliers/${id}`);
  }

  async createSupplier(payload: any) {
    return this.request<any>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateSupplier(id: string, payload: any) {
    return this.request<any>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteSupplier(id: string) {
    return this.request<any>(`/suppliers/${id}`, { method: 'DELETE' });
  }

  // Products & Categories
  async getProducts(params: { page?: number; limit?: number; search?: string; critical?: boolean } = {}) {
    return this.request<any>(`/products${toQueryString(params)}`);
  }

  async getCategories() {
    return this.request<any>('/products/categories');
  }

  async createProduct(payload: any) {
    return this.request<any>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProduct(id: string, payload: any) {
    return this.request<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteProduct(id: string) {
    return this.request<any>(`/products/${id}`, { method: 'DELETE' });
  }

  async adjustProductStock(id: string, payload: { type: 'IN' | 'OUT'; quantity: number; reason?: string }) {
    return this.request<any>(`/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Invoices
  async getInvoices(params: { type?: string; status?: string; search?: string; page?: number; limit?: number } = {}) {
    return this.request<any>(`/invoices${toQueryString(params)}`);
  }

  async getInvoice(id: string) {
    return this.request<any>(`/invoices/${id}`);
  }

  async createInvoice(payload: any) {
    return this.request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async approveInvoice(id: string) {
    return this.request<any>(`/invoices/${id}/approve`, {
      method: 'POST',
    });
  }

  async payInvoice(id: string, payload: { amount: number; account_id: string; date?: string; notes?: string }) {
    return this.request<any>(`/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteInvoice(id: string) {
    return this.request<any>(`/invoices/${id}`, { method: 'DELETE' });
  }

  async sendInvoice(id: string, payload: { sendType: 'EINVOICE' | 'EMAIL'; emailRecipient?: string; emailSubject?: string; emailBody?: string }) {
    return this.request<any>(`/invoices/${id}/send`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getInvoicePdfUrl(id: string): string {
    const token = this.getToken();
    const comp = this.getCompanyId();
    return `${getApiBaseUrl()}/invoices/${id}/pdf?token=${token}&companyId=${comp}`;
  }

  async downloadInvoicePdf(id: string): Promise<Blob> {
    return this.request<Blob>(`/invoices/${id}/pdf`);
  }

  // Payment Plans
  async getPaymentPlans(params: { status?: string; invoiceId?: string } = {}) {
    return this.request<any>(`/payment-plans${toQueryString(params)}`);
  }

  async createPaymentPlan(payload: { entity_type: string; entity_id: string; amount: number; due_date: string; notes?: string }) {
    return this.request<any>('/payment-plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async payInstallment(id: string, payload: { account_id: string; payment_date?: string }) {
    return this.request<any>(`/payment-plans/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deletePaymentPlan(id: string) {
    return this.request<any>(`/payment-plans/${id}`, { method: 'DELETE' });
  }

  // Cash & Banks
  async getCashBanks() {
    return this.request<any>('/cash-banks');
  }

  async createCashBank(payload: any) {
    return this.request<any>('/cash-banks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCashBank(id: string, payload: any) {
    return this.request<any>(`/cash-banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteCashBank(id: string) {
    return this.request<any>(`/cash-banks/${id}`, { method: 'DELETE' });
  }

  async transferFunds(payload: { source_account_id: string; destination_account_id: string; amount: number; fee?: number; description?: string }) {
    return this.request<any>('/cash-banks/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Income & Expenses
  async getIncomeExpenses(params: { type?: string; recurring?: boolean } = {}) {
    return this.request<any>(`/income-expenses${toQueryString(params)}`);
  }

  async createIncomeExpense(payload: any) {
    return this.request<any>('/income-expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Quotes & Orders
  async getQuotes() {
    return this.request<any>('/quotes-orders/quotes');
  }

  async createQuote(payload: any) {
    return this.request<any>('/quotes-orders/quotes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteQuote(id: string) {
    return this.request<any>(`/quotes-orders/quotes/${id}`, {
      method: 'DELETE',
    });
  }

  async convertQuoteToInvoice(id: string) {
    return this.request<any>(`/quotes-orders/quotes/${id}/convert-to-invoice`, {
      method: 'POST',
    });
  }

  async getOrders() {
    return this.request<any>('/quotes-orders/orders');
  }

  async createOrder(payload: any) {
    return this.request<any>('/quotes-orders/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async convertOrderToInvoice(id: string) {
    return this.request<any>(`/quotes-orders/orders/${id}/convert-to-invoice`, {
      method: 'POST',
    });
  }

  async deleteOrder(id: string) {
    return this.request<any>(`/quotes-orders/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Documents & Folders
  async getFolders() {
    return this.request<any>('/documents/folders');
  }

  async createFolder(payload: { name: string; parent_id?: string; color?: string }) {
    return this.request<any>('/documents/folders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteFolder(id: string) {
    return this.request<any>(`/documents/folders/${id}`, {
      method: 'DELETE',
    });
  }

  async getDocuments(params: { folderId?: string; linkedType?: string; linkedId?: string; search?: string } = {}) {
    return this.request<any>(`/documents${toQueryString(params)}`);
  }

  getDocumentDownloadUrl(id: string): string {
    const token = this.getToken();
    const comp = this.getCompanyId();
    return `${getApiBaseUrl()}/documents/${id}/download?token=${token}&companyId=${comp}`;
  }

  async uploadDocument(formData: FormData) {
    return this.request<any>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteDocument(id: string) {
    return this.request<any>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Reports & Dashboard
  async getDashboardStats() {
    return this.request<any>('/reports/dashboard');
  }

  async getProfitLoss(startDate?: string, endDate?: string) {
    return this.request<any>(`/reports/profit-loss${toQueryString({ startDate, endDate })}`);
  }

  async getCashFlow() {
    return this.request<any>('/reports/cash-flow');
  }

  getExcelExportUrl(module: string): string {
    const token = this.getToken();
    const comp = this.getCompanyId();
    return `${getApiBaseUrl()}/reports/export-excel?module=${module}&token=${token}&companyId=${comp}`;
  }

  // Audit & Trash
  async getAuditLogs(page: number = 1) {
    return this.request<any>(`/audit/logs?page=${page}`);
  }

  async getTrash() {
    return this.request<any>('/audit/trash');
  }

  async restoreTrash(id: string, entityType: string) {
    return this.request<any>('/audit/trash/restore', {
      method: 'POST',
      body: JSON.stringify({ id, entityType }),
    });
  }

  // Firebase & Cloud Infrastructure
  async getFirebaseStatus() {
    return this.request<any>('/firebase/status');
  }

  async updateFirebaseConfig(payload: any) {
    return this.request<any>('/firebase/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async syncFirebase() {
    return this.request<any>('/firebase/sync', {
      method: 'POST',
    });
  }

  async restoreFirebase() {
    return this.request<any>('/firebase/restore', {
      method: 'POST',
    });
  }

  // Master Admin & 3-Stage MFA Data Recovery
  async masterAdminInitiate(payload: { email: string; password: string; masterKey: string }) {
    return this.request<any>('/admin/auth/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async masterAdminVerifyStep(payload: { sessionToken: string; code: string }) {
    const res = await this.request<any>('/admin/auth/verify-step', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async getAdminCompanies() {
    return this.request<any>('/admin/companies');
  }

  async getAdminCompanyOverview(companyId: string) {
    return this.request<any>(`/admin/companies/${companyId}/overview`);
  }

  async restoreCustomerAdmin(customerId: string) {
    return this.request<any>(`/admin/restore/customer/${customerId}`, {
      method: 'POST',
    });
  }

  async restoreInvoiceAdmin(invoiceId: string) {
    return this.request<any>(`/admin/restore/invoice/${invoiceId}`, {
      method: 'POST',
    });
  }

  async restoreSnapshotAdmin(snapshotId: string) {
    return this.request<any>(`/admin/restore/snapshot/${snapshotId}`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
