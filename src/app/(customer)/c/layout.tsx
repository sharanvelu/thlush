/**
 * The customer-facing site. Served at the root of the customer domain (the proxy rewrites every path under
 * `/c`), and never on the POS domain. Keep it free of anything from the staff app: no staff components,
 * no staff services, no session.
 */
export default function CustomerLayout({ children }: LayoutProps<"/c">) {
  return <div className="min-h-dvh bg-background text-foreground">{children}</div>;
}
