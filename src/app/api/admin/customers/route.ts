import {NextResponse} from 'next/server';
import {CustomerService, CustomerWithOrderCount} from '@/services/CustomerService';
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {SupabaseService} from "@/services/SupabaseService.server";

export async function GET(): Promise<NextResponse<TypeApiListResponse<CustomerWithOrderCount>>> {
  if (!await SupabaseService.authUser()) {
    return NextResponse.json(
      {success: false, error: 'Authentication required'},
      {status: 401}
    );
  }

  const customers: CustomerWithOrderCount[] = await CustomerService.getAllCustomers();

  return NextResponse.json({
    success: true,
    data: customers,
  });
}
