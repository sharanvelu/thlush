import {NextRequest, NextResponse} from 'next/server';
import {BillingService} from '@/services/BillingService';
import {
  BillFilters as TypeBillFilters,
  BillSortBy,
  BillWithCustomer as TypeBillWithCustomer
} from "@/types/billing";
import {shouldIgnoreTax} from "@/helpers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: Partial<TypeBillFilters> = {};
    let hasFilters = false;

    const startDate: string | null = searchParams.get('start_date');
    if (startDate) {
      filters.start_date = startDate;
      hasFilters = true;
    }

    const endDate: string | null = searchParams.get('end_date');
    if (endDate) {
      filters.end_date = endDate;
      hasFilters = true;
    }

    const customerName: string | null = searchParams.get('customer_name');
    if (customerName) {
      filters.customer_name = customerName;
      hasFilters = true;
    }

    const itemName: string | null = searchParams.get('item_name');
    if (itemName) {
      filters.item_name = itemName;
      hasFilters = true;
    }

    const minTotal: string | null = searchParams.get('min_total');
    if (minTotal) {
      filters.min_total = minTotal;
      hasFilters = true;
    }

    const maxTotal: string | null = searchParams.get('max_total');
    if (maxTotal) {
      filters.max_total = maxTotal;
      hasFilters = true;
    }

    const sortBy: string | null = searchParams.get('sort_by');
    if (sortBy && Object.values(BillSortBy).includes(sortBy as BillSortBy)) {
      filters.sort_by = sortBy as BillSortBy;
    }

    // No limit when filters are applied, otherwise latest 100
    const perPage: number = hasFilters ? 1000 : 100;

    const {bills} = await BillingService.getBills(1, perPage, filters);

    const csv = buildCsv(bills);

    const filename = `billing-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting bills:', error);
    return NextResponse.json(
      {success: false, error: 'Failed to export bills'},
      {status: 500}
    );
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(bills: TypeBillWithCustomer[]): string {
  const ignoreTax = shouldIgnoreTax();

  const headers = [
    'Bill ID',
    'Date',
    'Customer',
    'Item',
    'Qty',
    'Currency',
    'Price',
    'Tax',
    'Total',
  ];

  const rows: string[] = [headers.join(',')];

  for (const bill of bills) {
    const customerName: string = bill.customers?.name || 'Walk-in Customer';
    const billDate: string = new Date(bill.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const billHeaderRow: string[] = [
      bill.id.toString(),
      escapeCsv(billDate),
      escapeCsv(customerName),
      '',
      bill.bill_items.length.toString(),
      bill.currency,
      '',
      bill.total_tax.toFixed(2),
      bill.total_amount.toFixed(2),
    ];

    rows.push(billHeaderRow.join(','));

    for (const item of bill.bill_items) {
      const tax = ((item.sgst + item.cgst) * item.price * item.quantity / 100).toFixed(2);

      const row: string[] = [
        '',
        '',
        '',
        escapeCsv(item.name),
        item.quantity.toString(),
        bill.currency,
        item.price.toFixed(2),
        ...(ignoreTax ? [] : [tax]),
        item.total.toFixed(2),
      ];

      rows.push(row.join(','));
    }

    // Empty line between the bills
    rows.push(Array.from({length: headers.length}).join(',-'));
  }

  return rows.join('\n');
}
