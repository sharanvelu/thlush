import {
  Beer,
  CakeSlice,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  IceCreamCone,
  Package,
  Pizza,
  Salad,
  Sandwich,
  ShoppingBasket,
  Soup,
  Tag,
  Utensils,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIconName } from "@/config/category-icons";
import { cn } from "@/lib/utils";

export const CATEGORY_ICON_COMPONENTS: Record<CategoryIconName, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": CupSoda,
  beer: Beer,
  wine: Wine,
  utensils: Utensils,
  soup: Soup,
  salad: Salad,
  sandwich: Sandwich,
  pizza: Pizza,
  "egg-fried": EggFried,
  drumstick: Drumstick,
  fish: Fish,
  "cake-slice": CakeSlice,
  "ice-cream-cone": IceCreamCone,
  cookie: Cookie,
  croissant: Croissant,
  wheat: Wheat,
  package: Package,
  "shopping-basket": ShoppingBasket,
  tag: Tag,
};

interface CategoryBadgeProps {
  icon: string | null;
  color: string | null;
  className?: string;
}

/** A rounded tile showing the category's icon in its colour. Decorative. */
export function CategoryBadge({ icon, color, className }: CategoryBadgeProps) {
  const Icon = (icon && CATEGORY_ICON_COMPONENTS[icon as CategoryIconName]) || Tag;
  const tint = color ?? "#64748b";
  return (
    <span
      aria-hidden
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", className)}
      style={{ backgroundColor: `${tint}26`, color: tint }}
    >
      <Icon className="size-4.5" />
    </span>
  );
}
