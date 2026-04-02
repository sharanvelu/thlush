import {CategoryStatus} from "@/types/category";

interface CategoryStatusTagProps {
  status: CategoryStatus;
}

export default function CategoryStatusTag({status}: CategoryStatusTagProps) {
  if (status === CategoryStatus.ACTIVE) {
    return;
  }

  return (
    <div className="absolute top-0 right-0 scale-90">
      <div className="px-3 py-1 text-xs font-extralight rounded-2xl bg-red-300 text-red-700">
        {status}
      </div>
    </div>
  );
}