/**
 * Titles and descriptions that do not depend on who is looking. Pages and their loading skeletons both read
 * from here, so the heading shown while data loads is exactly the one that stays when it arrives.
 * `description: null` means it varies by role, so the skeleton draws a placeholder line instead.
 */
export interface PageCopy {
  title: string;
  description: string | null;
}

export const PAGE_COPY = {
  menu: { title: "Menu", description: null },
  bills: { title: "Bill History", description: null },
  categories: { title: "Categories", description: "Drag to set the order of the tabs on the billing screen. Disabled categories and their items are hidden there." },
  customers: { title: "Customers", description: "Who orders, how often and how much." },
  stock: { title: "Stock Overview", description: "What you have, what's running low, and what it's worth." },
  adjustments: { title: "Stock Adjustments", description: "Correct counts, record wastage and see every change to stock." },
  suppliers: { title: "Suppliers & Purchases", description: "Record deliveries to add stock, and keep your suppliers in one place." },
  reports: { title: "Reports", description: "Sales, tax, discounts and stock, with the same figures in the table, the chart and the export." },
  users: { title: "Users & Roles", description: "Who can sign in, and what they can do." },
  auditLog: { title: "Audit Log", description: "Who did what, and when. Entries can't be edited or removed from here." },
  settings: { title: "Settings", description: "Business details, tax, receipts and what's switched on." },
  customPrint: { title: "Custom Print", description: "Type free text and print it on the thermal printer. Each text field is cut off as its own slip." },
  profile: { title: "Profile", description: "Your account details and preferences." },
} as const satisfies Record<string, PageCopy>;
