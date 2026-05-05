import {NeonService} from "@/services/NeonService";
import {DatabaseService} from "@/services/DatabaseService";
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
import {NeonQueryFunction} from "@neondatabase/serverless";

const tables = DatabaseService.table_names;

export const BillingService = {
  saveInvoice: async (invoiceDto: TypeSaveInvoiceDto, userId: string): Promise<TypeBill> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    // 1. Create or find customer
    let customerId: number | null = null;
    if (invoiceDto.customer_name.trim()) {
      const [customer] = await sql.query(
        `INSERT INTO ${tables.customers} (name) VALUES ($1) RETURNING *`,
        [invoiceDto.customer_name.trim()]
      ) as TypeCustomer[];

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
    const [bill] = await sql.query(
      `INSERT INTO ${tables.bills} (customer_id, total_amount, total_tax, currency, status, created_user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [customerId, parseFloat(totalAmount.toFixed(2)), parseFloat(totalTax.toFixed(2)), 'INR', 'completed', userId]
    ) as TypeBill[];

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

    for (const item of billItems) {
      await sql.query(
        `INSERT INTO ${tables.bill_items} (bill_id, menu_item_id, name, price, sgst, cgst, quantity, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [item.bill_id, item.menu_item_id, item.name, item.price, item.sgst, item.cgst, item.quantity, item.total]
      );
    }

    return bill;
  },

  getBills: async (page: number = 1, perPage: number = 10, filters?: Partial<TypeBillFilters>): Promise<{
    bills: TypeBillWithCustomer[],
    pagination: TypePagination
  }> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.start_date) {
      conditions.push(`b.created_at >= $${paramIndex++}`);
      params.push(new Date(filters.start_date).toISOString());
    }

    if (filters?.end_date) {
      conditions.push(`b.created_at <= $${paramIndex++}`);
      params.push(new Date(filters.end_date + 'T23:59:59.999').toISOString());
    }

    if (filters?.customer_name) {
      conditions.push(`c.name ILIKE $${paramIndex++}`);
      params.push(`%${filters.customer_name}%`);
    }

    if (filters?.item_name) {
      conditions.push(`EXISTS (SELECT 1 FROM ${tables.bill_items} bi2 WHERE bi2.bill_id = b.id AND bi2.name ILIKE $${paramIndex++})`);
      params.push(`%${filters.item_name}%`);
    }

    if (filters?.min_total) {
      conditions.push(`b.total_amount >= $${paramIndex++}`);
      params.push(parseFloat(filters.min_total));
    }

    if (filters?.max_total) {
      conditions.push(`b.total_amount <= $${paramIndex++}`);
      params.push(parseFloat(filters.max_total));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await sql.query(
      `SELECT COUNT(DISTINCT b.id) as count
       FROM ${tables.bills} b
       LEFT JOIN ${tables.customers} c ON c.id = b.customer_id
       ${whereClause}`,
      params
    );

    const totalItems: number = parseInt(countResult[0].count as string) || 0;
    const totalPages: number = Math.ceil(totalItems / perPage);
    const offset: number = (page - 1) * perPage;

    // Determine sort
    let orderClause: string;
    const sortBy: BillSortBy = filters?.sort_by ?? BillSortBy.DATE_NEWEST;
    switch (sortBy) {
      case BillSortBy.DATE_OLDEST:
        orderClause = 'b.created_at ASC';
        break;
      case BillSortBy.TOTAL_HIGH:
        orderClause = 'b.total_amount DESC';
        break;
      case BillSortBy.TOTAL_LOW:
        orderClause = 'b.total_amount ASC';
        break;
      case BillSortBy.CUSTOMER_NAME_A_Z:
        orderClause = 'c.name ASC NULLS LAST';
        break;
      case BillSortBy.CUSTOMER_NAME_Z_A:
        orderClause = 'c.name DESC NULLS LAST';
        break;
      case BillSortBy.DATE_NEWEST:
      default:
        orderClause = 'b.created_at DESC';
        break;
    }

    // Fetch bills with customer
    const billRows = await sql.query(
      `SELECT b.*,
              row_to_json(c) as customers
       FROM ${tables.bills} b
       LEFT JOIN ${tables.customers} c ON c.id = b.customer_id
       ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, perPage, offset]
    );

    // Fetch bill items for these bills
    const billIds = billRows.map((b: Record<string, unknown>) => (b as unknown as TypeBill).id);
    let billItemsMap: Record<number, unknown[]> = {};

    if (billIds.length > 0) {
      const billItems = await sql.query(
        `SELECT * FROM ${tables.bill_items} WHERE bill_id = ANY($1) ORDER BY id ASC`,
        [billIds]
      );

      billItemsMap = billItems.reduce((acc: Record<number, unknown[]>, item: Record<string, unknown>) => {
        const billId = item.bill_id as number;
        if (!acc[billId]) acc[billId] = [];
        acc[billId].push(item);
        return acc;
      }, {} as Record<number, unknown[]>);
    }

    const bills: TypeBillWithCustomer[] = billRows.map((row: Record<string, unknown>) => ({
      ...row,
      bill_items: billItemsMap[(row as unknown as TypeBill).id] || [],
    })) as TypeBillWithCustomer[];

    const pagination: TypePagination = {
      current_page: page,
      items_per_page: perPage,
      total_pages: totalPages,
      total_items: totalItems,
      has_next_page: page < totalPages,
      has_prev_page: page > 1,
    };

    return {bills, pagination};
  },

  getTodayStats: async (): Promise<TypeTodayStats> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const todayStart: string = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const billsResult = await sql.query(
      `SELECT total_amount FROM ${tables.bills} WHERE created_at >= $1`,
      [todayStart]
    );

    const itemsResult = await sql.query(
      `SELECT bi.quantity
       FROM ${tables.bill_items} bi
       INNER JOIN ${tables.bills} b ON b.id = bi.bill_id
       WHERE b.created_at >= $1`,
      [todayStart]
    );

    const totalBills: number = billsResult.length;
    const totalRevenue: number = billsResult.reduce((sum: number, b: Record<string, unknown>) => sum + ((b.total_amount as number) ?? 0), 0);
    const avgOrderValue: number = totalBills > 0 ? totalRevenue / totalBills : 0;
    const totalItems: number = itemsResult.reduce((sum: number, item: Record<string, unknown>) => sum + ((item.quantity as number) ?? 0), 0);

    return {
      total_bills: totalBills,
      total_revenue: parseFloat(totalRevenue.toFixed(2)),
      avg_order_value: parseFloat(avgOrderValue.toFixed(2)),
      total_items: totalItems,
    };
  },

  getOverallStats: async (): Promise<TypeOverallStats> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [billsCount, revenueResult, menuCount, categoryCount] = await Promise.all([
      sql.query(`SELECT COUNT(*) as count FROM ${tables.bills}`),
      sql.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM ${tables.bills}`),
      sql.query(`SELECT COUNT(*) as count FROM ${tables.menu_items}`),
      sql.query(`SELECT COUNT(*) as count FROM ${tables.categories}`),
    ]);

    return {
      total_bills: parseInt(billsCount[0].count as string) || 0,
      total_revenue: parseFloat(parseFloat(revenueResult[0].total as string).toFixed(2)) || 0,
      total_menu_items: parseInt(menuCount[0].count as string) || 0,
      total_categories: parseInt(categoryCount[0].count as string) || 0,
    };
  },
};
