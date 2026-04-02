import {MenuItemStatus} from "@/types/menu";

interface MenuItemStatusTagProps {
  status: MenuItemStatus;
}

export default function MenuItemStatusTag({status}: MenuItemStatusTagProps) {
  if (status === MenuItemStatus.ACTIVE) {
    return;
  }

  return (
    <div className="absolute top-0 right-0 scale-90">
      <div className="px-3 py-1 text-xs font-extralight rounded-2xl bg-red-300 text-red-700">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    </div>
  );
}