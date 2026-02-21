import {MenuItemStatus} from "@/types/menu";

interface MenuItemStatusTagProps {
  status: MenuItemStatus;
}

export default function MenuItemStatusTag({status}: MenuItemStatusTagProps) {
  const colors: string = status === MenuItemStatus.ACTIVE
    ? "bg-green-300 text-green-700"
    : "bg-red-300 text-red-700";

  return (
    <div className="absolute top-0 right-0 scale-90">
      <div className={`px-3 py-1 text-xs font-extralight rounded-2xl ${colors}`}>
        {status}
      </div>
    </div>
  );
}