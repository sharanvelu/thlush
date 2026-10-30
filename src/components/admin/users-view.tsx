"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { RoleBadge } from "@/components/layout/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS, ROLES } from "@/config/permissions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, errorMessage } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";
import type { UserListQuery } from "@/lib/validation/user";
import type { AdminUser } from "@/services/UserAdminService";

interface UsersViewProps {
  rows: AdminUser[];
  total: number;
  query: UserListQuery;
  currentUserId: string;
  settings: { locale: string; timezone: string };
}

export function UsersView({ rows, total, query, currentUserId, settings }: UsersViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");
  const debounced = useDebouncedValue(search, 300);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [pending, setPending] = useState(false);

  const setParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      if (resetPage) params.delete("page");
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const next = debounced.trim();
    if (next !== (query.q ?? "")) setParams({ q: next || null });
    // Only the typed text should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  const confirmDelete = async () => {
    if (!deleting) return;
    setPending(true);
    try {
      await api.delete(`/api/admin/users/${deleting.id}`);
      toast.success(`Deleted ${deleting.name}. Their bills and history are kept.`);
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(null);
    } finally {
      setPending(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Who can sign in, and what they can do."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden /> Add user
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2" role="search">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search users" className="pl-8" />
        </div>
        <Select value={query.role ?? "all"} onValueChange={(v) => setParams({ role: v === "all" ? null : v })}>
          <SelectTrigger className="w-44" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {total === 0 ? (
        <EmptyState icon={ShieldCheck} title="No users match" description="Try a different search or role." action={<Button variant="outline" onClick={() => { setSearch(""); setParams({ q: null, role: null }); }}>Clear filters</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
                <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const self = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={`/admin/users/${u.id}`} className="font-medium underline-offset-4 hover:underline">{u.name}</Link>
                      {self ? <Badge variant="secondary" className="ml-2">You</Badge> : null}
                      <span className="block text-xs text-muted-foreground">
                        {u.email}
                        {!u.hasPassword ? " · single sign-on" : ""}
                      </span>
                    </TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">{formatDate(u.createdAt, { locale: settings.locale, timeZone: settings.timezone })}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt, { locale: settings.locale, timeZone: settings.timezone }) : "Never"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${u.name}`}>
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => { setEditing(u); setFormOpen(true); }}>
                            <Pencil aria-hidden /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" disabled={self} onSelect={() => setDeleting(u)}>
                            <Trash2 aria-hidden /> {self ? "Delete (not yourself)" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">{total} {total === 1 ? "user" : "users"}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={query.page <= 1} onClick={() => setParams({ page: String(query.page - 1) }, false)} aria-label="Previous page"><ChevronLeft className="size-4" aria-hidden /></Button>
            <span className="min-w-16 text-center tabular-nums">{query.page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={query.page >= totalPages} onClick={() => setParams({ page: String(query.page + 1) }, false)} aria-label="Next page"><ChevronRight className="size-4" aria-hidden /></Button>
          </div>
        </nav>
      ) : null}

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} currentUserId={currentUserId} onSaved={() => router.refresh()} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "this user"}?`}
        description="They can no longer sign in. Their bills and audit history are kept. This can't be undone."
        confirmLabel="Delete user"
        destructive
        pending={pending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
