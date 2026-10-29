import {BillingItem as TypeBillingItem} from "@/types/billing";
import {MenuItem as TypeMenuItem} from "@/types/menu";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";
import {useState} from "react";
import BillingItem from "@/components/BillingItem";
import Icon from "@/components/Icon";

interface CategoryWithMenuItemProps {
  categoryWithMenuItem: TypeCategoryWithMenuItem;
  billingItems: TypeBillingItem[];
  updateBillingItemAction: (item: TypeBillingItem, quantity: number) => void;
}

export default function CategoryBillingItem(
  {categoryWithMenuItem, billingItems, updateBillingItemAction}: CategoryWithMenuItemProps
) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const toggleMenuItems = () => {
    setIsExpanded(!isExpanded);
  }

  return (
    <section key={categoryWithMenuItem.id} className="card">
      <button
        type="button"
        className={`card-head w-full text-left cursor-pointer rounded-[14px] ${isExpanded ? 'rounded-b-none' : 'border-b-0'}`}
        onClick={toggleMenuItems}
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink truncate">{categoryWithMenuItem.name}</span>
          <span className="badge num">{categoryWithMenuItem.menu_items.length}</span>
        </span>
        <span className={`text-ink-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <Icon name="chevronDown" size={18}/>
        </span>
      </button>

      {isExpanded && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 p-4">
          {categoryWithMenuItem.menu_items.map((menuItem: TypeMenuItem) => (
            <BillingItem
              key={menuItem.id}
              menu={menuItem}
              billingQuantity={billingItems.find((x: TypeBillingItem): boolean => x.id === menuItem.id)?.quantity ?? 0}
              updateItem={updateBillingItemAction}
            />
          ))}
        </div>
      )}
    </section>
  );
};
