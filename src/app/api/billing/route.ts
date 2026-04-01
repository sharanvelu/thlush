import {NextResponse} from 'next/server';
import {BillingService} from '@/services/BillingService';
import {Bill as TypeBill, SaveInvoiceDto as TypeSaveInvoiceDto} from "@/types/billing";
import {ApiResponse as TypeApiResponse} from "@/types/global";

export async function POST(request: Request): Promise<NextResponse<TypeApiResponse<TypeBill>>> {
  try {
    const invoiceDto: TypeSaveInvoiceDto = await request.json();

    if (!invoiceDto.items || invoiceDto.items.length === 0) {
      return NextResponse.json(
        {success: false, error: 'No items provided'},
        {status: 400}
      );
    }

    const bill: TypeBill = await BillingService.saveInvoice(invoiceDto);

    return NextResponse.json({
      success: true,
      data: bill,
    });
  } catch (error) {
    console.error('Error saving invoice:', error);
    return NextResponse.json(
      {success: false, error: 'Failed to save invoice'},
      {status: 500}
    );
  }
}
