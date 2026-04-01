import {NextResponse} from 'next/server';
import {BillingService} from '@/services/BillingService';
import {OverallStats as TypeOverallStats} from "@/types/billing";
import {ApiResponse as TypeApiResponse} from "@/types/global";

export async function GET(): Promise<NextResponse<TypeApiResponse<TypeOverallStats>>> {
  try {
    const stats: TypeOverallStats = await BillingService.getOverallStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    return NextResponse.json(
      {success: false, error: 'Failed to fetch overall stats'},
      {status: 500}
    );
  }
}
