import {SupabaseService} from "@/services/SupabaseService.server";
import {
  Bill as TypeBill,
  BillWithCustomer as TypeBillWithCustomer,
  Customer as TypeCustomer,
  OverallStats as TypeOverallStats,
  SaveInvoiceDto as TypeSaveInvoiceDto,
  SaveInvoiceItemDto as TypeSaveInvoiceItemDto,
  TodayStats as TypeTodayStats,
} from "@/types/billing";
import {Pagination as TypePagination} from "@/types/global";
import {calculateTotalTaxPriceValue, calculateTotalValue} from "@/helpers";

export const BillingService = {
  saveInvoice: async (invoiceDto: TypeSaveInvoiceDto): Promise<TypeBill> => {
    const supabase = await SupabaseService.getServerClient();

    // 1. Create or find customer
    let customerId: number | null = null;
    if (invoiceDto.customer_name.trim()) {
      const {data: customer, error: customerError} = await supabase
        .from('thlush_customers')
        .insert([{name: invoiceDto.customer_name.trim()}])
        .select()
        .single<TypeCustomer>();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        throw new Error('Failed to create customer');
      }
      customerId = customer.id;
    }

    // 2. Calculate totals
    const totalAmount: number = invoiceDto.items.reduce(
      (sum: number, item: TypeSaveInvoiceItemDto): number => sum + calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity),
      0
    );

    const totalTax: number = invoiceDto.items.reduce(
      (sum: number, item: TypeSaveInvoiceItemDto): number => sum + calculateTotalTaxPriceValue(item.price, item.sgst, item.cgst, item.quantity),
      0
    );

    // 3. Create bill
    const {data: bill, error: billError} = await supabase
      .from('thlush_bills')
      .insert([{
        customer_id: customerId,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        total_tax: parseFloat(totalTax.toFixed(2)),
        currency: 'INR',
        status: 'completed',
      }])
      .select()
      .single<TypeBill>();

    if (billError) {
      console.error('Error creating bill:', billError);
      throw new Error('Failed to create bill');
    }

    // 4. Create bill items
    const billItems = invoiceDto.items.map((item) => ({
      bill_id: bill.id,
      menu_item_id: item.menu_item_id,
      name: item.name,
      price: item.price,
      sgst: item.sgst,
      cgst: item.cgst,
      quantity: item.quantity,
      total: parseFloat(calculateTotalValue(item.price, item.sgst, item.cgst, item.quantity).toFixed(2)),
    }));

    const {error: itemsError} = await supabase
      .from('thlush_bill_items')
      .insert(billItems);

    if (itemsError) {
      console.error('Error creating bill items:', itemsError);
      throw new Error('Failed to create bill items');
    }

    return bill;
  },

  getBills: async (page: number = 1, perPage: number = 10): Promise<{bills: TypeBillWithCustomer[], pagination: TypePagination}> => {
    const supabase = await SupabaseService.getServerClient();

    // Get total count
    const {count, error: countError} = await supabase
      .from('thlush_bills')
      .select('*', {count: 'exact', head: true});

    if (countError) {
      console.error('Error counting bills:', countError);
      throw new Error('Failed to count bills');
    }

    const totalItems: number = count ?? 0;
    const totalPages: number = Math.ceil(totalItems / perPage);
    const from: number = (page - 1) * perPage;
    const to: number = from + perPage - 1;

    // Fetch bills with customer and bill items
    const {data: bills, error} = await supabase
      .from('thlush_bills')
      .select('*, thlush_customers(*), thlush_bill_items(*)')
      .order('created_at', {ascending: false})
      .range(from, to);

    if (error) {
      console.error('Error fetching bills:', error);
      throw new Error('Failed to fetch bills');
    }

    const pagination: TypePagination = {
      current_page: page,
      items_per_page: perPage,
      total_pages: totalPages,
      total_items: totalItems,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
    };

    return {bills: bills as TypeBillWithCustomer[], pagination};
  },

  getTodayStats: async (): Promise<TypeTodayStats> => {
    const supabase = await SupabaseService.getServerClient();

    const todayStart: string = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    // Fetch today's bills
    const {data: bills, error: billsError} = await supabase
      .from('thlush_bills')
      .select('total_amount')
      .gte('created_at', todayStart);

    if (billsError) {
      console.error('Error fetching today bills:', billsError);
      throw new Error('Failed to fetch today stats');
    }

    // Fetch today's total items
    const {data: billItems, error: itemsError} = await supabase
      .from('thlush_bill_items')
      .select('quantity, bill_id, thlush_bills!inner(created_at)')
      .gte('thlush_bills.created_at', todayStart);

    if (itemsError) {
      console.error('Error fetching today bill items:', itemsError);
      throw new Error('Failed to fetch today item stats');
    }

    const totalBills: number = bills.length;
    const totalRevenue: number = bills.reduce((sum: number, b) => sum + (b.total_amount ?? 0), 0);
    const avgOrderValue: number = totalBills > 0 ? totalRevenue / totalBills : 0;
    const totalItems: number = billItems.reduce((sum: number, item) => sum + (item.quantity ?? 0), 0);

    return {
      total_bills: totalBills,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      avg_order_value: parseFloat(avgOrderValue.toFixed(2)),
      total_items: totalItems,
    };
  },

  getOverallStats: async (): Promise<TypeOverallStats> => {
    const supabase = await SupabaseService.getServerClient();

    const {count, error} = await supabase
      .from('thlush_bills')
      .select('*', {count: 'exact', head: true});

    if (error) {
      console.error('Error fetching overall stats:', error);
      throw new Error('Failed to fetch overall stats');
    }

    return {
      total_bills: count ?? 0,
    };
  },
};
