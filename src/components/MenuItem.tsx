import {MenuItem as TypeMenuItem} from "@/types/menu";

interface MenuItemProps {
  menu: TypeMenuItem;
  editAction: (menu: TypeMenuItem) => void;
}

export default function MenuItem({menu, editAction}: MenuItemProps) {
  const removeItem = () => {
    /**/
  }

  return (
    <div
      className="shadow-lg border-2 border-solid border-[#f0e6dd] dark:border-gray-600 rounded-2xl p-4.5 bg-[#fffbf6] dark:bg-gray-950 flex justify-between items-center mb-5">
      <div className="item-manage-info">
        <h4 className="m-0 mb-1.5 text-lg">{menu.name}</h4>
        <p className="m-0 mb-1 text-sm">{menu.description || 'No description'}</p>
        <span className="text-[#f0673a] font-semibold text-[16px]">₹{menu.price.toFixed(2)}</span>
      </div>

      <div className="flex gap-4">
        <button
          className="hover:bg-linear-to-br from-[#008559] via-[#006ce0] to-[#6842ff] text-[#dc3545] hover:text-white dark:text-white border-2 border-[#dc3545] rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer hover:scale-105 active:scale-95"
          style={{transition: "transform 0.15s"}}
          onClick={() => editAction(menu)}
        >Edit
        </button>
        <button
          className="bg-[#dc3545] text-white border-none rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer hover:scale-105 active:scale-95"
          style={{transition: "transform 0.15s"}}
          onClick={() => removeItem()}
        >Remove
        </button>
      </div>
    </div>
  );
} 