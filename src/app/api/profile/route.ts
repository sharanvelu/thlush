import {NextResponse} from 'next/server';
import {AuthService} from "@/services/AuthService";
import {UserService} from "@/services/UserService";
import {ApiResponse as TypeApiResponse} from "@/types/global";
import {AdminUser as TypeAdminUser} from "@/types/user";

export async function GET(): Promise<NextResponse<TypeApiResponse<TypeAdminUser>>> {
  const authUser = await AuthService.getAuthUser();

  if (!authUser) {
    return NextResponse.json({success: false, error: 'Authentication required'}, {status: 401});
  }

  const user = await UserService.getUser(authUser.id);

  return NextResponse.json({success: true, data: user});
}

export async function PUT(request: Request): Promise<NextResponse<TypeApiResponse<TypeAdminUser>>> {
  const authUser = await AuthService.getAuthUser();

  if (!authUser) {
    return NextResponse.json({success: false, error: 'Authentication required'}, {status: 401});
  }

  const {name, password} = await request.json();

  const dto: Record<string, string> = {};
  if (name !== undefined) dto.name = name;
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({success: false, error: 'Password must be at least 6 characters'}, {status: 400});
    }
    dto.password = password;
  }

  if (Object.keys(dto).length === 0) {
    return NextResponse.json({success: false, error: 'No fields to update'}, {status: 400});
  }

  const user = await UserService.updateUser(authUser.id, dto);

  return NextResponse.json({success: true, data: user});
}
