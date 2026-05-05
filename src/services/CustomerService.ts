import {NeonService} from "@/services/NeonService";
import {DatabaseService} from "@/services/DatabaseService";
import {
  Customer as TypeCustomer,
  Bill as TypeBill,
  BillWithCustomer as TypeBillWithCustomer,
} from "@/types/billing";
import {NeonQueryFunction} from "@neondatabase/serverless";

const tables = DatabaseService.table_names;

export interface CustomerWithOrderCount extends TypeCustomer {
  order_count: number;
}

export const CustomerService = {
  getAllCustomers: async (): Promise<CustomerWithOrderCount[]> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const customers = await sql.query(
      `SELECT c.*, COUNT(b.id)::int as order_count
       FROM ${tables.customers} c
       LEFT JOIN ${tables.bills} b ON b.customer_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );

    return customers as CustomerWithOrderCount[];
  },

  getCustomerById: async (id: number): Promise<TypeCustomer | null> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [customer] = await sql.query(
      `SELECT * FROM ${tables.customers} WHERE id = $1`,
      [id]
    );

    return (customer as TypeCustomer) ?? null;
  },

  getCustomerBills: async (customerId: number): Promise<TypeBillWithCustomer[]> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const billRows = await sql.query(
      `SELECT b.*,
              row_to_json(c) as customers
       FROM ${tables.bills} b
       LEFT JOIN ${tables.customers} c ON c.id = b.customer_id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [customerId]
    );

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

    return billRows.map((row: Record<string, unknown>) => ({
      ...row,
      total_amount: parseFloat(row.total_amount as string) || 0,
      total_tax: parseFloat(row.total_tax as string) || 0,
      bill_items: (billItemsMap[(row as unknown as TypeBill).id] || []).map((item: unknown) => {
        const i = item as Record<string, unknown>;
        return {
          ...i,
          price: parseFloat(i.price as string) || 0,
          sgst: parseFloat(i.sgst as string) || 0,
          cgst: parseFloat(i.cgst as string) || 0,
          quantity: parseInt(i.quantity as string) || 0,
          total: parseFloat(i.total as string) || 0,
        };
      }),
    })) as TypeBillWithCustomer[];
  },

  updateCustomerName: async (id: number, name: string): Promise<TypeCustomer> => {
    const sql: NeonQueryFunction<false, false> = NeonService.getClient();

    const [customer] = await sql.query(
      `UPDATE ${tables.customers} SET name = $1 WHERE id = $2 RETURNING *`,
      [name, id]
    );

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer as TypeCustomer;
  },
};
