import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";
import { StaffView } from "@/components/staff/staff-view";
import { requireAccess } from "@/services/AuthService";
import { listStaff } from "@/services/StaffService";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const { allowed } = await requireAccess("staff.manage");
  if (!allowed) return <Forbidden />;
  return <StaffView staff={await listStaff()} />;
}
