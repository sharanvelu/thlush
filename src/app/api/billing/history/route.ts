import {NextRequest, NextResponse} from 'next/server';
import {BillingService} from '@/services/BillingService';
import {BillFilters as TypeBillFilters, BillSortBy, BillWithCustomer as TypeBillWithCustomer} from "@/types/billing";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";

export async function GET(request: NextRequest): Promise<NextResponse<TypeApiListResponse<TypeBillWithCustomer>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page: number = parseInt(searchParams.get('page') ?? '1');
    const perPage: number = parseInt(searchParams.get('per_page') ?? '10');

    const filters: Partial<TypeBillFilters> = {};

    const startDate: string | null = searchParams.get('start_date');
    if (startDate) filters.start_date = startDate;

    const endDate: string | null = searchParams.get('end_date');
    if (endDate) filters.end_date = endDate;

    const customerName: string | null = searchParams.get('customer_name');
    if (customerName) filters.customer_name = customerName;

    const itemName: string | null = searchParams.get('item_name');
    if (itemName) filters.item_name = itemName;

    const minTotal: string | null = searchParams.get('min_total');
    if (minTotal) filters.min_total = minTotal;

    const maxTotal: string | null = searchParams.get('max_total');
    if (maxTotal) filters.max_total = maxTotal;

    const sortBy: string | null = searchParams.get('sort_by');
    if (sortBy && Object.values(BillSortBy).includes(sortBy as BillSortBy)) {
      filters.sort_by = sortBy as BillSortBy;
    }

    const {bills, pagination} = await BillingService.getBills(page, perPage, filters);

    return NextResponse.json({
      success: true,
      data: bills,
      pagination,
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    return NextResponse.json(
      {success: false, error: 'Failed to fetch billing history'},
      {status: 500}
    );
  }
}
