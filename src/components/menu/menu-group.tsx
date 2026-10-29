import { ChevronDown, EyeOff } from "lucide-react";
import { CategoryBadge } from "@/components/categories/category-icon";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MenuListItem } from "@/services/MenuService";

interface GroupLabelProps {
  /** Any item from the group; supplies the category's name, colour and icon. */
  item: Pick<MenuListItem, "categoryName" | "categoryColor" | "categoryIcon" | "categoryStatus">;
  /** Items of this category shown on the current page. */
  onPage: number;
  /** Items of this category across all pages. */
  total: number;
  headingId?: string;
  /** Whether the group's items are showing. */
  expanded: boolean;
  onToggle: () => void;
  /** Id of the element this header shows and hides. */
  controlsId?: string;
}

/**
 * Accordion header for a category: a button inside a heading, so screen readers
 * get both the section title and the expanded or collapsed state.
 */
export function GroupLabel({ item, onPage, total, headingId, expanded, onToggle, controlsId }: GroupLabelProps) {
  const split = total > onPage;
  return (
    <h2 id={headingId} className="min-w-0 flex-1 text-sm">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={controlsId}
        onClick={onToggle}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-md py-1 text-left"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
            !expanded && "-rotate-90",
          )}
          aria-hidden
        />
        <CategoryBadge icon={item.categoryIcon} color={item.categoryColor} className="size-7 rounded-md" />
        <span className="truncate font-semibold">{item.categoryName}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">
          {split ? `${onPage} of ${total} items` : `${total} ${total === 1 ? "item" : "items"}`}
        </span>
        {item.categoryStatus === "disabled" ? (
          <Badge variant="secondary" className="shrink-0 gap-1" title="This category is hidden on the billing screen">
            <EyeOff className="size-3" aria-hidden /> Hidden in POS
          </Badge>
        ) : null}
      </button>
    </h2>
  );
}
