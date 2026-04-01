import {SupabaseService} from "@/services/SupabaseService.server";
import {
  Bill as TypeBill,
  Customer as TypeCustomer,
  SaveInvoiceDto as TypeSaveInvoiceDto,
  SaveInvoiceItemDto as TypeSaveInvoiceItemDto,
} from "@/types/billing";
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
};
