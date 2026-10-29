import {MenuItem as TypeMenuItem} from "@/types/menu";
import MenuItem from "@/components/MenuItem";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem, CategoryStatus} from "@/types/category";
import {useState} from "react";
import Icon from "@/components/Icon";

interface CategoryWithMenuItemProps {
  categoryWithMenuItem: TypeCategoryWithMenuItem;
  menuItemEditAction: (menuItem: TypeMenuItem) => void;
  refreshMenuItems: () => void;
}

export default function CategoryMenuItem(
  {categoryWithMenuItem, menuItemEditAction, refreshMenuItems}: CategoryWithMenuItemProps
) {
  const [isExpanded, setIsExpanded] = useState<boolean>(categoryWithMenuItem.menu_items.length > 0);

  const toggleMenuItems = () => {
    setIsExpanded(!isExpanded);
  }

  const count: number = categoryWithMenuItem.menu_items.length;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-sunken sm:px-5"
        onClick={toggleMenuItems}
        aria-expanded={isExpanded}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <h3 className="truncate text-[15px] font-semibold text-ink">{categoryWithMenuItem.name}</h3>
          <span className="badge num">{count} {count === 1 ? 'item' : 'items'}</span>
          {categoryWithMenuItem.status === CategoryStatus.DISABLE && (
            <span className="badge badge-bad">Disabled</span>
          )}
        </div>
        <Icon
          name="chevronDown"
          size={16}
          className={`shrink-0 text-ink-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-line">
          {count === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-ink-3">No items in this category</p>
          ) : (
            categoryWithMenuItem.menu_items.map((menuItem: TypeMenuItem) => (
              <MenuItem
                key={menuItem.id}
                menu={menuItem}
                editAction={menuItemEditAction}
                refreshMenuItems={refreshMenuItems}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
