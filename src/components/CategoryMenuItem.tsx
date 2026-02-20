import {MenuItem as TypeMenuItem} from "@/types/menu";
import MenuItem from "@/components/MenuItem";
import {CategoryWithMenuItem as TypeCategoryWithMenuItem} from "@/types/category";
import {useState} from "react";

interface CategoryWithMenuItemProps {
  categoryWithMenuItem: TypeCategoryWithMenuItem;
  menuItemEditAction: (menuItem: TypeMenuItem) => void;
  refreshMenuItems: () => void;
}

export default function CategoryMenuItem(
  {categoryWithMenuItem, menuItemEditAction, refreshMenuItems}: CategoryWithMenuItemProps
) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const toggleMenuItems = () => {
    setIsExpanded(!isExpanded);
  }

  return (
    <div key={categoryWithMenuItem.id}
         className="bg-gray-50 dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl">
      <div className="flex items-center justify-between px-6 py-4 cursor-pointer" onClick={toggleMenuItems}>
        <div className="text-xl">{categoryWithMenuItem.name}</div>
        <div className={isExpanded ? '' : 'rotate-180'}>
          <svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6V18M12 6L7 11M12 6L17 11" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'h-fit' : 'h-0'}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 px-5 pb-5">
          {categoryWithMenuItem.menu_items.map((menuItem: TypeMenuItem) => (
            <MenuItem
              key={menuItem.id}
              menu={menuItem}
              editAction={menuItemEditAction}
              refreshMenuItems={refreshMenuItems}
            />
          ))}
        </div>
      </div>
    </div>
  );
};