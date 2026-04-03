import {NextResponse} from 'next/server';
import {UserService} from '@/services/UserService';
import {AdminUser as TypeAdminUser, CreateUserDto as TypeCreateUserDto} from "@/types/user";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {SupabaseService} from "@/services/SupabaseService.server";

export async function GET(): Promise<NextResponse<TypeApiListResponse<TypeAdminUser>>> {
  try {
    const authUser = await SupabaseService.authUser();
    if (!authUser) {
      return NextResponse.json({success: false, error: 'Authentication required'}, {status: 401});
    }

    const users: TypeAdminUser[] = await UserService.listUsers();

    return NextResponse.json({success: true, data: users});
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json({success: false, error: 'Failed to list users'}, {status: 500});
  }
}

export async function POST(request: Request): Promise<NextResponse<TypeApiResponse<TypeAdminUser>>> {
  try {
    const authUser = await SupabaseService.authUser();
    if (!authUser) {
      return NextResponse.json({success: false, error: 'Authentication required'}, {status: 401});
    }

    const dto: TypeCreateUserDto = await request.json();

    if (!dto.name || !dto.email || !dto.password) {
      return NextResponse.json({success: false, error: 'Name, email and password are required'}, {status: 400});
    }

    if (dto.password.length < 6) {
      return NextResponse.json({success: false, error: 'Password must be at least 6 characters'}, {status: 400});
    }

    const user: TypeAdminUser = await UserService.createUser(dto);

    return NextResponse.json({success: true, data: user});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';
    console.error('Error creating user:', error);
    return NextResponse.json({success: false, error: message}, {status: 500});
  }
}
