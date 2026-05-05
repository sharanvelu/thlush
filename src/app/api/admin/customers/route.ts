import {NextResponse} from 'next/server';
import {CustomerService, CustomerWithOrderCount} from '@/services/CustomerService';
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {AuthService} from "@/services/AuthService";

export async function GET(): Promise<NextResponse<TypeApiListResponse<CustomerWithOrderCount>>> {
  if (!await AuthService.checkAuth()) {
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
