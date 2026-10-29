import type { MenuSortField } from "@/lib/validation/menu";
import type { MenuListItem } from "@/services/MenuService";

/** Shared formatting context for money in the menu views. */
export interface MoneyFormat {
  currency: string;
  locale: string;
}

/** Callbacks the table and grid use to act on an item. Null when the user is read-only. */
export interface MenuItemActions {
  onEdit: (item: MenuListItem) => void;
  onDuplicate: (item: MenuListItem) => void;
  onDelete: (item: MenuListItem) => void;
  onToggleStatus: (item: MenuListItem, active: boolean) => void;
}

export interface SortState {
  field: MenuSortField;
  dir: "asc" | "desc";
}
