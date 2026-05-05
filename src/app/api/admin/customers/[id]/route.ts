import {NextResponse} from 'next/server';
import {SupabaseService} from "@/services/SupabaseService.server";
import {CustomerService} from '@/services/CustomerService';
import {ApiResponse as TypeApiResponse} from "@/types/global";
import {Customer as TypeCustomer, BillWithCustomer as TypeBillWithCustomer} from "@/types/billing";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }>; },
): Promise<NextResponse<TypeApiResponse<{ customer: TypeCustomer; bills: TypeBillWithCustomer[] }>>> {
  if (!await SupabaseService.authUser()) {
    return NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const {id} = await context.params;

  if (isNaN(parseInt(id))) {
    return NextResponse.json(
      {success: false, error: 'Invalid Customer ID'},
      {status: 400}
    );
  }

  const customer = await CustomerService.getCustomerById(parseInt(id));

  if (!customer) {
    return NextResponse.json(
      {success: false, error: 'Customer not found'},
      {status: 404}
    );
  }

  const bills = await CustomerService.getCustomerBills(parseInt(id));

  return NextResponse.json({
    success: true,
    data: {customer, bills},
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }>; },
): Promise<NextResponse<TypeApiResponse<TypeCustomer>>> {
  if (!await SupabaseService.authUser()) {
    return NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const {id} = await context.params;

  if (isNaN(parseInt(id))) {
    return NextResponse.json(
      {success: false, error: 'Invalid Customer ID'},
      {status: 400}
    );
  }

  const {name} = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json(
      {success: false, error: 'Name is required'},
      {status: 400}
    );
  }

  const customer = await CustomerService.updateCustomerName(parseInt(id), name.trim());

  return NextResponse.json({
    success: true,
    data: customer,
  });
}
