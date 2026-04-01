import {NextRequest, NextResponse} from 'next/server';
import {BillingService} from '@/services/BillingService';
import {BillWithCustomer as TypeBillWithCustomer} from "@/types/billing";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";

export async function GET(request: NextRequest): Promise<NextResponse<TypeApiListResponse<TypeBillWithCustomer>>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page: number = parseInt(searchParams.get('page') ?? '1');
    const perPage: number = parseInt(searchParams.get('per_page') ?? '10');

    const {bills, pagination} = await BillingService.getBills(page, perPage);

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
