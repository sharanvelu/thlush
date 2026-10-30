"use client";

import { ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditQuery } from "@/lib/validation/audit";
import type { UserOption } from "@/services/UserService";

const ANY = "any";
const KEYS = ["user", "entity", "action", "from", "to"] as const;

interface AuditFiltersProps {
  query: AuditQuery;
  users: UserOption[];
  entities: string[];
  total: number;
}

export function AuditFilters({ query, users, entities, total }: AuditFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const active = KEYS.filter((k) => query[k]).length;
  const [draft, setDraft] = useState<Pick<AuditQuery, (typeof KEYS)[number]>>({ user: query.user, entity: query.entity, action: query.action, from: query.from, to: query.to });

  const push = (values: Record<string, string | undefined>, keepPage = false) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(values)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (!keepPage) params.delete("page");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

  return (
    <>
      <form
        className="mb-4 rounded-xl border bg-card p-4 shadow-card"
        aria-label="Audit log filters"
        onSubmit={(e) => {
          e.preventDefault();
          push(draft);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            User
            <Select value={draft.user ?? ANY} onValueChange={(v) => setDraft((d) => ({ ...d, user: v === ANY ? undefined : v }))}>
              <SelectTrigger className="w-full" aria-label="User"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Everyone</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Record type
            <Select value={draft.entity ?? ANY} onValueChange={(v) => setDraft((d) => ({ ...d, entity: v === ANY ? undefined : v }))}>
              <SelectTrigger className="w-full" aria-label="Record type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Anything</SelectItem>
                {entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Action contains
            <Input value={draft.action ?? ""} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value || undefined }))} placeholder="e.g. void" maxLength={60} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            From
            <Input type="date" value={draft.from ?? ""} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || undefined }))} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            To
            <Input type="date" value={draft.to ?? ""} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || undefined }))} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit"><Filter aria-hidden /> Apply</Button>
          <Button type="button" variant="ghost" disabled={active === 0} onClick={() => { setDraft({}); push(Object.fromEntries(KEYS.map((k) => [k, undefined]))); }}>
            <X aria-hidden /> Reset
          </Button>
          {active > 0 ? <Badge className="tabular-nums" aria-label={`${active} active filters`}>{active}</Badge> : null}
          <span className="ml-auto text-sm text-muted-foreground" aria-live="polite" aria-busy={pending}>{total} {total === 1 ? "entry" : "entries"}</span>
        </div>
      </form>

      <nav aria-label="Pagination" className="mt-4 flex items-center justify-end gap-2 text-sm">
        <Button variant="outline" size="icon" disabled={query.page <= 1} onClick={() => push({ page: String(query.page - 1) }, true)} aria-label="Previous page"><ChevronLeft className="size-4" aria-hidden /></Button>
        <span className="min-w-16 text-center tabular-nums">{query.page} / {totalPages}</span>
        <Button variant="outline" size="icon" disabled={query.page >= totalPages} onClick={() => push({ page: String(query.page + 1) }, true)} aria-label="Next page"><ChevronRight className="size-4" aria-hidden /></Button>
      </nav>
    </>
  );
}
