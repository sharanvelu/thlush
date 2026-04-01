import {MenuItem} from "@/types/menu";

export interface BillingItem extends MenuItem {
  quantity: number;
}

// DTOs for saving invoice
export interface SaveInvoiceDto {
  customer_name: string;
  items: SaveInvoiceItemDto[];
}

export interface SaveInvoiceItemDto {
  menu_item_id: number;
  name: string;
  price: number;
  sgst: number;
  cgst: number;
  quantity: number;
  total: number;
}

// DB types
export interface Customer {
  id: number;
  name: string;
  created_at: string;
}

export interface Bill {
  id: number;
  customer_id: number | null;
  total_amount: number;
  total_tax: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface BillWithCustomer extends Bill {
  thlush_customers: Customer | null;
  thlush_bill_items: BillItem[];
}

// Stats types
export interface TodayStats {
  total_bills: number;
  total_revenue: number;
  avg_order_value: number;
  total_items: number;
}

export interface OverallStats {
  total_bills: number;
}

export interface BillItem {
  id: number;
  bill_id: number;
  menu_item_id: number | null;
  name: string;
  price: number;
  sgst: number;
  cgst: number;
  quantity: number;
  total: number;
  created_at: string;
}
