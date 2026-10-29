import {MenuItem as TypeMenuItem, MenuItemStatus} from "@/types/menu";
import {calculateTotalTaxValue, calculateTotalValue, shouldIgnoreTax} from "@/helpers";
import {ApiDeleteResponse as TypeApiDeleteResponse} from "@/types/global";
import {useState} from "react";
import toast from "react-hot-toast";
import Icon from "@/components/Icon";

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
      toast.error(data.error || 'Failed to delete menu item');
      return;
    }

    toast.success('Menu item deleted successfully!');
    refreshMenuItems()
    setIsDeleting(false);
  }

  const disabled: boolean = menu.status === MenuItemStatus.DISABLE;
  const tax: number = calculateTotalTaxValue(menu.sgst, menu.cgst);

  return (
    <div className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-sunken sm:gap-4 sm:px-5 ${isDeleting ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className={`truncate text-sm font-medium ${disabled ? 'text-ink-3' : 'text-ink'}`}>{menu.name}</h4>
          {disabled && <span className="badge badge-bad">Disabled</span>}
        </div>
        {menu.description && <p className="mt-0.5 truncate text-[13px] text-ink-3">{menu.description}</p>}
      </div>

      <div className="shrink-0 text-right">
        <div className="num text-sm font-semibold text-ink">{menu.currency}{calculateTotalValue(menu.price, menu.cgst, menu.sgst)}</div>
        {!shouldIgnoreTax() && tax > 0 && <div className="num text-[11px] text-ink-3">{tax}% tax</div>}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          aria-label={`Edit ${menu.name}`}
          title="Edit"
          onClick={() => editAction(menu)}
          disabled={isDeleting}
        >
          <Icon name="edit" size={15}/>
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm hover:!bg-bad-soft hover:!text-bad"
          aria-label={`Remove ${menu.name}`}
          title="Remove"
          onClick={() => removeMenuItem()}
          disabled={isDeleting}
        >
          {isDeleting ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span> : <Icon name="trash" size={15}/>}
        </button>
      </div>
    </div>
  );
}
