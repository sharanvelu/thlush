import {NextResponse} from 'next/server';
import {BillingService} from '@/services/BillingService';
import {TodayStats as TypeTodayStats} from "@/types/billing";
import {ApiResponse as TypeApiResponse} from "@/types/global";

export async function GET(): Promise<NextResponse<TypeApiResponse<TypeTodayStats>>> {
  try {
    const stats: TypeTodayStats = await BillingService.getTodayStats();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return NextResponse.json(
      {success: false, error: 'Failed to fetch today stats'},
      {status: 500}
    );
  }
}
