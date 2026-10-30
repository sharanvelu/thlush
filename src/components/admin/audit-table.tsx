import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { AuditRow } from "@/services/AuditLogService";

const TONE: Record<string, string> = { delete: "bg-destructive/10 text-destructive", void: "bg-destructive/10 text-destructive", refund: "bg-warning/20", create: "bg-success/15 text-success", login: "bg-secondary text-secondary-foreground" };

function tone(action: string): string {
  const verb = action.split(".").pop() ?? action;
  return TONE[verb] ?? "bg-secondary text-secondary-foreground";
}

/** Who did what and when. Details open on demand so the table stays scannable. */
export function AuditTable({ rows, locale, timeZone, showUser = true }: { rows: AuditRow[]; locale: string; timeZone: string; showUser?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>When</TableHead>
            {showUser ? <TableHead>Who</TableHead> : null}
            <TableHead>Action</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.createdAt, { locale, timeZone })}</TableCell>
              {showUser ? <TableCell>{row.userName ?? <span className="text-muted-foreground">{row.userId ? "Deleted user" : "System"}</span>}</TableCell> : null}
              <TableCell>
                <Badge variant="secondary" className={`border-transparent font-mono text-xs ${tone(row.action)}`}>{row.action}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.entity}
                {row.entityId ? <span className="block max-w-40 truncate font-mono text-xs">{row.entityId}</span> : null}
              </TableCell>
              <TableCell className="max-w-xs">
                {row.metadata && Object.keys(row.metadata).length > 0 ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:underline">View</summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">{JSON.stringify(row.metadata, null, 2)}</pre>
                  </details>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
