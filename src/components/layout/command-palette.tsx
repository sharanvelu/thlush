"use client";

import { FolderPlus, PackagePlus, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navForRole } from "@/config/navigation";
import { hasPermission, type Role } from "@/config/permissions";

interface CommandPaletteProps {
  role: Role;
  features: { inventory: boolean };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Cmd/Ctrl+K palette: jump to any page the role can open, or run a quick action. */
export function CommandPalette({ role, features, open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const groups = navForRole(role, features);
  const actions = [
    hasPermission(role, "bills.create") && { label: "New bill", href: "/billing", icon: ReceiptText },
    hasPermission(role, "menu.manage") && {
      label: "Add menu item",
      href: "/menu?new=1",
      icon: PackagePlus,
    },
    hasPermission(role, "categories.manage") && {
      label: "Add category",
      href: "/categories?new=1",
      icon: FolderPlus,
    },
  ].filter((a): a is { label: string; href: string; icon: typeof ReceiptText } => Boolean(a));

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search pages and actions"
    >
      <CommandInput placeholder="Search pages and actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {actions.length > 0 ? (
          <>
            <CommandGroup heading="Quick actions">
              {actions.map(({ label, href, icon: Icon }) => (
                <CommandItem key={href} value={label} onSelect={() => go(href)}>
                  <Icon aria-hidden />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        ) : null}
        {groups.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                  onSelect={() => go(item.href)}
                >
                  <Icon aria-hidden />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
