import {NextResponse} from 'next/server';
import {UserService} from '@/services/UserService';
import {AdminUser as TypeAdminUser, UpdateUserDto as TypeUpdateUserDto} from "@/types/user";
import {ApiDeleteResponse as TypeApiDeleteResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import {SupabaseService} from "@/services/SupabaseService.server";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }>; },
): Promise<NextResponse<TypeApiResponse<TypeAdminUser>>> {
  try {
    const authUser = await SupabaseService.authUser();
    if (!authUser) {
      return NextResponse.json({success: false, error: 'Authentication required'}, {status: 401});
    }

    const {id} = await context.params;

    const dto: TypeUpdateUserDto = await request.json();

    if (!dto.name && !dto.email && !dto.password) {
      return NextResponse.json({success: false, error: 'At least name, email or password is required'}, {status: 400});
    }

    if (dto.password && dto.password.length < 6) {
      return NextResponse.json({success: false, error: 'Password must be at least 6 characters'}, {status: 400});
    }

    const user: TypeAdminUser = await UserService.updateUser(id, dto);

    return NextResponse.json({success: true, data: user});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    console.error('Error updating user:', error);
    return NextResponse.json({success: false, error: message}, {status: 500});
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }>; },
): Promise<NextResponse<TypeApiDeleteResponse>> {
  try {
    const authUser = await SupabaseService.authUser();
    if (!authUser) {
      return NextResponse.json({success: false, error: 'Authentication required'}, {status: 401});
    }

    const {id} = await context.params;

    // Prevent self-deletion
    if (authUser.id === id) {
      return NextResponse.json({success: false, error: 'Cannot delete your own account'}, {status: 400});
    }

    await UserService.deleteUser(id);

    return NextResponse.json({success: true, message: 'User deleted successfully'});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    console.error('Error deleting user:', error);
    return NextResponse.json({success: false, error: message}, {status: 500});
  }
}
