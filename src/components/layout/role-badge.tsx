import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Role } from "@/config/permissions";
import { cn } from "@/lib/utils";

const STYLES: Record<Role, string> = {
  super_admin: "bg-primary text-primary-foreground",
  manager: "bg-accent text-accent-foreground",
  billing: "bg-secondary text-secondary-foreground",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[role], className)}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
