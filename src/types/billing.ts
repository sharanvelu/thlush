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
  created_user_id?: string;
}

export interface BillWithCustomer extends Bill {
  customers: Customer | null;
  bill_items: BillItem[];
}

// Filter types
export interface BillFilters {
  start_date: string;
  end_date: string;
  customer_name: string;
  item_name: string;
  min_total: string;
  max_total: string;
  sort_by: BillSortBy;
}

export enum BillSortBy {
  DATE_NEWEST = 'date_newest',
  DATE_OLDEST = 'date_oldest',
  TOTAL_HIGH = 'total_high',
  TOTAL_LOW = 'total_low',
  CUSTOMER_NAME = 'customer_name',
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
  total_revenue: number;
  total_menu_items: number;
  total_categories: number;
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
