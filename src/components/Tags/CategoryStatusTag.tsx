import {CategoryStatus} from "@/types/category";

interface CategoryStatusTagProps {
  status: CategoryStatus;
}

export default function CategoryStatusTag({status}: CategoryStatusTagProps) {
  const colors: string = status === CategoryStatus.ACTIVE
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