import {Category as TypeCategory, CategoryStatus} from "@/types/category";
import {useState} from "react";
import {ApiDeleteResponse as TypeApiDeleteResponse} from "@/types/global";
import toast from "react-hot-toast";
import Icon from "@/components/Icon";

interface CategoryProps {
  category: TypeCategory;
  editAction: (category: TypeCategory) => void;
  refreshCategories: () => void;
}

export default function Category({category, editAction, refreshCategories}: CategoryProps) {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const removeCategory = async () => {
    setIsDeleting(true);

    const response = await fetch(`/api/categories/${category.id}`, {
      method: 'DELETE'
    });

    const data: TypeApiDeleteResponse = await response.json();

    if (!data.success) {
      setIsDeleting(false);
      toast.error(data.error || 'Failed to delete category');
      return;
    }

    toast.success('Category deleted successfully!');
    refreshCategories();
    setIsDeleting(false);
  }

  const disabled: boolean = category.status === CategoryStatus.DISABLE;

  return (
    <div className={`card card-pad flex w-full flex-col gap-3 ${isDeleting ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <Icon name="tag" size={16}/>
          </span>
          <h4 className={`truncate text-[15px] font-semibold ${disabled ? 'text-ink-3' : 'text-ink'}`}>{category.name}</h4>
        </div>
        <span className={`badge badge-dot shrink-0 ${disabled ? 'badge-bad' : 'badge-good'}`}>{disabled ? 'Disabled' : 'Active'}</span>
      </div>

      <p className="line-clamp-2 flex-1 text-[13px] text-ink-3">{category.description}</p>

      <div className="flex items-center justify-end gap-1 border-t border-line pt-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => editAction(category)}
          disabled={isDeleting}
        >
          <Icon name="edit" size={14}/>
          Edit
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm hover:!bg-bad-soft hover:!text-bad"
          onClick={() => removeCategory()}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
              Removing
            </>
          ) : (
            <>
              <Icon name="trash" size={14}/>
              Remove
            </>
          )}
        </button>
      </div>
    </div>
  );
}
