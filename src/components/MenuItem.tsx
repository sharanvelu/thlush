import {MenuItem as TypeMenuItem} from "@/types/menu";
import {calculateTotalValue} from "@/helpers";
import {ApiDeleteResponse as TypeApiDeleteResponse} from "@/types/global";
import {useState} from "react";

interface MenuItemProps {
  menu: TypeMenuItem;
  editAction: (menu: TypeMenuItem) => void;
  refreshMenuItems: () => void;
}

export default function MenuItem({menu, editAction, refreshMenuItems}: MenuItemProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const removeMenuItem = async () => {
    setIsDeleting(true);

    const response = await fetch(`/api/menu/${menu.id}`, {
      method: 'DELETE'
    });

    const data: TypeApiDeleteResponse = await response.json();

    if (!data.success) {
      setIsDeleting(false);
      throw new Error(data.error || 'Failed to delete menu item');
    }

    refreshMenuItems()
    setIsDeleting(false);
  }

  return (
    <div
      className="shadow-lg border-2 border-solid border-[#f0e6dd] dark:border-gray-600 rounded-2xl p-4.5 bg-[#fffbf6] dark:bg-gray-950 flex justify-between items-center">
      <div className="flex flex-col gap-2">
        <h4 className="m-0 mb-1.5 text-lg">{menu.name}</h4>
        <p className="m-0 mb-1 text-sm">{menu.description || 'No description'}</p>
        <span className="text-[#f0673a] font-semibold text-[16px]">{menu.currency}{calculateTotalValue(menu.price, menu.cgst, menu.sgst)}</span>
      </div>

      <div className="flex gap-4">
        <button
          className={`from-[#008559] via-[#006ce0] to-[#6842ff] text-[#dc3545] dark:text-white border-2 border-[#dc3545] rounded-xl px-5 py-2.5 text-sm font-semibold ${isDeleting ? 'cursor-not-allowed': 'cursor-pointer hover:scale-105 active:scale-95 hover:bg-linear-to-br hover:text-white'}`}
          style={{transition: "transform 0.15s"}}
          onClick={() => editAction(menu)}
          disabled={isDeleting}
        >Edit
        </button>
        <button
          className={`flex items-center bg-[#dc3545] text-white border-none rounded-xl px-5 py-2.5 text-sm font-semibold ${isDeleting ? 'cursor-not-allowed': 'cursor-pointer hover:scale-105 active:scale-95'}`}
          style={{transition: "transform 0.15s"}}
          onClick={() => removeMenuItem()}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                   fill="none"
                   viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Removing
            </>
          ) : (
            <>Remove</>
          )}
        </button>
      </div>
    </div>
  );
} 