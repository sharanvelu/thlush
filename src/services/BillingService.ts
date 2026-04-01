import {SupabaseService} from "@/services/SupabaseService.server";
import {
  Bill as TypeBill,
  BillFilters as TypeBillFilters,
  BillSortBy,
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

  getBills: async (page: number = 1, perPage: number = 10, filters?: Partial<TypeBillFilters>): Promise<{bills: TypeBillWithCustomer[], pagination: TypePagination}> => {
    const supabase = await SupabaseService.getServerClient();

    // Build base query for count
    let countQuery = supabase
      .from('thlush_bills')
      .select('*, thlush_customers!left(name), thlush_bill_items!left(name)', {count: 'exact', head: true});

    // Build base query for data
    let dataQuery = supabase
      .from('thlush_bills')
      .select('*, thlush_customers(*), thlush_bill_items(*)');

    // Apply filters to both queries
    if (filters?.start_date) {
      const startDate: string = new Date(filters.start_date).toISOString();
      countQuery = countQuery.gte('created_at', startDate);
      dataQuery = dataQuery.gte('created_at', startDate);
    }

    if (filters?.end_date) {
      const endDate: string = new Date(filters.end_date + 'T23:59:59.999').toISOString();
      countQuery = countQuery.lte('created_at', endDate);
      dataQuery = dataQuery.lte('created_at', endDate);
    }

    if (filters?.customer_name) {
      countQuery = countQuery.ilike('thlush_customers.name', `%${filters.customer_name}%`);
      dataQuery = dataQuery.ilike('thlush_customers.name', `%${filters.customer_name}%`);
    }

    if (filters?.item_name) {
      countQuery = countQuery.ilike('thlush_bill_items.name', `%${filters.item_name}%`);
      dataQuery = dataQuery.ilike('thlush_bill_items.name', `%${filters.item_name}%`);
    }

    if (filters?.min_total) {
      countQuery = countQuery.gte('total_amount', parseFloat(filters.min_total));
      dataQuery = dataQuery.gte('total_amount', parseFloat(filters.min_total));
    }

    if (filters?.max_total) {
      countQuery = countQuery.lte('total_amount', parseFloat(filters.max_total));
      dataQuery = dataQuery.lte('total_amount', parseFloat(filters.max_total));
    }

    // Get total count
    const {count, error: countError} = await countQuery;

    if (countError) {
      console.error('Error counting bills:', countError);
      throw new Error('Failed to count bills');
    }

    const totalItems: number = count ?? 0;
    const totalPages: number = Math.ceil(totalItems / perPage);
    const from: number = (page - 1) * perPage;
    const to: number = from + perPage - 1;

    // Apply sorting
    const sortBy: BillSortBy = filters?.sort_by ?? BillSortBy.DATE_NEWEST;
    switch (sortBy) {
      case BillSortBy.DATE_OLDEST:
        dataQuery = dataQuery.order('created_at', {ascending: true});
        break;
      case BillSortBy.TOTAL_HIGH:
        dataQuery = dataQuery.order('total_amount', {ascending: false});
        break;
      case BillSortBy.TOTAL_LOW:
        dataQuery = dataQuery.order('total_amount', {ascending: true});
        break;
      case BillSortBy.CUSTOMER_NAME:
        dataQuery = dataQuery.order('name', {referencedTable: 'thlush_customers', ascending: true});
        break;
      case BillSortBy.DATE_NEWEST:
      default:
        dataQuery = dataQuery.order('created_at', {ascending: false});
        break;
    }

    // Fetch bills
    const {data: bills, error} = await dataQuery.range(from, to);

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

    const [billsResult, revenueResult, menuResult, categoryResult] = await Promise.all([
      supabase.from('thlush_bills').select('*', {count: 'exact', head: true}),
      supabase.from('thlush_bills').select('total_amount'),
      supabase.from('thlush_menu_items').select('*', {count: 'exact', head: true}),
      supabase.from('thlush_categories').select('*', {count: 'exact', head: true}),
    ]);

    if (billsResult.error || revenueResult.error || menuResult.error || categoryResult.error) {
      console.error('Error fetching overall stats');
      throw new Error('Failed to fetch overall stats');
    }

    const totalRevenue: number = (revenueResult.data ?? []).reduce(
      (sum: number, b) => sum + (b.total_amount ?? 0), 0
    );

    return {
      total_bills: billsResult.count ?? 0,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      total_menu_items: menuResult.count ?? 0,
      total_categories: categoryResult.count ?? 0,
    };
  },
};
