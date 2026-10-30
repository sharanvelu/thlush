import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BillStatusBadge } from "@/components/bills/bill-status-badge";
import { CustomerActions } from "@/components/customers/customer-actions";
import { Forbidden } from "@/components/layout/forbidden";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasPermission } from "@/config/permissions";
import { HttpError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { D, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireAccess } from "@/services/AuthService";
import { listBills } from "@/services/BillHistoryService";
import { getCustomerRecord } from "@/services/CustomerService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Customer" };
const PAGE_SIZE = 10;

export default async function CustomerPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  const { user, allowed } = await requireAccess("customers.view");
  if (!allowed) return <Forbidden />;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const customer = await getCustomerRecord(id).catch((e: unknown) => {
    if (e instanceof HttpError && e.status === 404) return null;
    throw e;
  });
  if (!customer) notFound();

  const settings = await getSettings();
  const { currency, locale, timezone } = settings.locale;
  // Cashiers get only their own bills with this customer; managers and admins get all.
  const history = await listBills({ sort: "date_desc", customerId: id }, { page, pageSize: PAGE_SIZE }, user, timezone);
  const totalPages = Math.max(1, Math.ceil(history.total / PAGE_SIZE));
  const money = (v: string, c = currency) => formatMoney(v, { currency: c, locale });
  const average = customer.orders > 0 ? new D(customer.spend).div(customer.orders).toFixed(2) : "0.00";

  const stats: Array<[string, string]> = [
    ["Total bills", String(customer.orders)],
    ["Total spent", money(customer.spend)],
    ["Average order value", money(average)],
    ["Last visit", customer.lastVisit ? formatDate(customer.lastVisit, { locale, timeZone: timezone }) : "Never"],
  ];
  const profile: Array<[string, string | null]> = [
    ["Phone", customer.phone],
    ["Email", customer.email],
    ["Customer since", formatDate(customer.createdAt, { locale, timeZone: timezone })],
  ];

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/customers" className="text-muted-foreground underline-offset-4 hover:underline">
          ← All customers
        </Link>
      </p>
      <PageHeader
        title={customer.name}
        actions={hasPermission(user.role, "customers.manage") ? <CustomerActions customer={customer} /> : null}
      />
      {customer.tags.length > 0 ? (
        <p className="-mt-4 mb-6 flex flex-wrap gap-1.5">
          {customer.tags.map((t) => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </p>
      ) : null}

      <section aria-label="Statistics" className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} className="shadow-card">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="h-fit shadow-card">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
              {profile.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-words">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {customer.notes ? (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-card xl:col-span-2">
          <CardHeader>
            <CardTitle>Bills</CardTitle>
          </CardHeader>
          <CardContent>
            {history.total === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                {hasPermission(user.role, "bills.view_all") ? "No bills for this customer yet." : "You haven't billed this customer yet."}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Bill</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.rows.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell>
                            <Link href={`/receipt/${bill.id}`} className="font-mono text-xs font-medium underline-offset-4 hover:underline">
                              {bill.billNo}
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(bill.createdAt, { locale, timeZone: timezone })}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", bill.status !== "completed" && "text-muted-foreground line-through")}>{money(bill.total, bill.currency)}</TableCell>
                          <TableCell><BillStatusBadge status={bill.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 ? (
                  <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Page {page} of {totalPages}</span>
                    <span className="flex gap-2">
                      <Button asChild variant="outline" size="icon" aria-disabled={page <= 1}>
                        <Link href={`/customers/${id}?page=${page - 1}`} aria-label="Previous page" className={cn(page <= 1 && "pointer-events-none opacity-50")}><ChevronLeft className="size-4" aria-hidden /></Link>
                      </Button>
                      <Button asChild variant="outline" size="icon" aria-disabled={page >= totalPages}>
                        <Link href={`/customers/${id}?page=${page + 1}`} aria-label="Next page" className={cn(page >= totalPages && "pointer-events-none opacity-50")}><ChevronRight className="size-4" aria-hidden /></Link>
                      </Button>
                    </span>
                  </nav>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
