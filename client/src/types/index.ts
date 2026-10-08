export interface Company {
  id: string;
  name: string;
  legal_title?: string;
  tax_office?: string;
  tax_number?: string;
  address?: string;
  city?: string;
  district?: string;
  phone?: string;
  email?: string;
  website?: string;
  iban?: string;
  bank_info?: string;
  invoice_prefix?: string;
  logo_url?: string;
  user_role?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  tcIdentity?: string;
  tc_identity?: string;
  phone?: string;
  role: string;
}

export interface Customer {
  id: string;
  code: string;
  title: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  tax_office?: string;
  tax_number?: string;
  tc_identity?: string;
  address?: string;
  city?: string;
  district?: string;
  credit_limit: number;
  payment_term_days: number;
  balance: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  code: string;
  title: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  tax_office?: string;
  tax_number?: string;
  address?: string;
  city?: string;
  district?: string;
  balance: number;
  notes?: string;
}

export interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  unit: string;
  buy_price: number;
  sell_price: number;
  vat_rate: number;
  min_stock: number;
  current_stock: number;
  is_service: number;
}

export interface InvoiceItem {
  id?: string;
  product_id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount?: number;
  vat_rate: number;
  vat_amount?: number;
  withholding_rate?: number;
  withholding_amount?: number;
  total_amount: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_type: 'SALES' | 'PURCHASE';
  invoice_no: string;
  customer_id?: string;
  supplier_id?: string;
  customer_title?: string;
  supplier_title?: string;
  customer_name?: string;
  supplier_name?: string;
  customer_email?: string;
  issue_date: string;
  due_date: string;
  status: 'DRAFT' | 'ISSUED' | 'PARTIAL_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_total: number;
  vat_total: number;
  withholding_total: number;
  excise_total: number;
  grand_total: number;
  paid_amount: number;
  remaining_amount: number;
  payment_method: string;
  notes?: string;
  items?: InvoiceItem[];
  is_einvoice?: number;
  einvoice_uuid?: string;
  einvoice_status?: string;
}

export interface PaymentPlan {
  id: string;
  invoice_id?: string;
  invoice_no?: string;
  entity_type: 'CUSTOMER' | 'SUPPLIER';
  entity_id: string;
  entity_name?: string;
  total_amount: number;
  installment_count: number;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
  isOverdue?: boolean;
  notes?: string;
}

export interface CashBank {
  id: string;
  type: 'CASH' | 'BANK';
  name: string;
  bank_name?: string;
  branch?: string;
  account_no?: string;
  iban?: string;
  currency: string;
  current_balance: number;
}

export interface IncomeExpense {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category_id?: string;
  category_name?: string;
  category_color?: string;
  account_name?: string;
  date: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  payment_status: string;
  is_recurring: number;
  recurrence_interval?: string;
  notes?: string;
}

export interface Folder {
  id: string;
  parent_id?: string;
  name: string;
  path: string;
  color: string;
  documentCount?: number;
}

export interface Document {
  id: string;
  folder_id?: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  linked_entity_type?: string;
  linked_entity_id?: string;
  created_at: string;
}

export interface DashboardStats {
  totalReceivable: number;
  totalPayable: number;
  totalCashTRY: number;
  totalBankTRY: number;
  totalLiquidAssets: number;
  totalIncomeThisMonth: number;
  totalExpenseThisMonth: number;
  netProfitThisMonth: number;
  collectionsThisMonth: number;
  paymentsThisMonth: number;
  overdueReceivables: Array<{
    id: string;
    invoice_no: string;
    due_date: string;
    remaining_amount: number;
    customer_title: string;
  }>;
  criticalStock: Array<{
    id: string;
    code: string;
    name: string;
    current_stock: number;
    min_stock: number;
    unit: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    gelir: number;
    gider: number;
    kar: number;
  }>;
}
