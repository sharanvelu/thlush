import {useEffect, useState} from "react";
import Icon from "@/components/Icon";
import {Category as TypeCategory, CategoryStatus, CategoryDto as TypeCategoryDto} from "@/types/category";
import InputField from "@/components/Inputs/Input";
import TextAreaField from "@/components/Inputs/TextArea";
import SelectField from "@/components/Inputs/Select";
import {ApiResponse as TypeApiResponse} from "@/types/global";
import toast from "react-hot-toast";

interface CategoryAddProps {
  category?: Partial<TypeCategory | null>;
  isEditing: boolean;
  clearForm: () => void;
  refreshCategories: () => void;
}

export default function CategoryAdd({category, isEditing, clearForm, refreshCategories}: CategoryAddProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isVisible: boolean = isOpen || isEditing;

  const [formData, setFormData] = useState<TypeCategoryDto>({
    name: category?.name || '',
    description: category?.description || '',
    status: category?.status || CategoryStatus.ACTIVE,
  });

  useEffect(() => {
    setFormData({
      name: category?.name || '',
      description: category?.description || '',
      status: category?.status || CategoryStatus.ACTIVE,
    })
  }, [category]);

  const clearFormData = () => {
    setFormData({
      name: '',
      description: '',
      status: CategoryStatus.ACTIVE,
    });

    setErrors([]);
    setIsOpen(false);
    clearForm();
  }

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearFormData();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const {name, value} = e.target;

    handleChangeValue(name, value);
  };

  const handleChangeValue = (name: string, value: string | number): void => {
    setFormData((prev: TypeCategoryDto) => ({
      ...prev,
      [name]: value,
    }));

  }

  const validateData = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('Name is required');
    // TODO: STATUS

    setErrors(errors);
    return errors.length > 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors([]);

    try {
      // Validate form
      const hasErrors: boolean = validateData()

      if (hasErrors) {
        return;
      }

      let response;
      if (isEditing && category?.id) {
        response = await fetch(`/api/categories/${category.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new Category
        response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      const data: TypeApiResponse<TypeCategory> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save Category');
      }

      toast.success(isEditing ? 'Category updated successfully!' : 'Category created successfully!');
      refreshCategories()
      clearFormData()
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving Category:', error);
      toast.error(error.message || 'An unexpected error occurred');
      setErrors([error.message || 'An unexpected error occurred']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setIsOpen(true)}>
        <Icon name="plus" size={16}/>
        Add category
      </button>

      {isVisible && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={clearFormData}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isEditing ? 'Edit Category' : 'Add Category'}
            className="pop flex h-full w-full max-w-[480px] flex-col bg-raised shadow-pop"
            style={{transformOrigin: 'right center'}}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.01em]">{isEditing ? 'Edit' : 'Add'} Category</h2>
                <p className="text-[13px] text-ink-3">{isEditing ? 'Update the details below.' : 'Fill in the details below.'}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Close" onClick={clearFormData}>
                <Icon name="x" size={16}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {errors.length > 0 && (
                <div className="mb-4 flex flex-col gap-1 rounded-lg bg-bad-soft px-3.5 py-3" role="alert">
                  {errors.map((error: string, index: number) => (
                    <p key={index} className="flex items-center gap-2 text-[13px] text-bad">
                      <Icon name="alert" size={14} className="shrink-0"/>
                      {error}
                    </p>
                  ))}
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
              <InputField
                id="name"
                title="Category Name"
                placeholder="Enter Category Name"
                value={formData.name}
                onchange={handleChangeValue}
              />
              <SelectField
                id="status"
                title="Status"
                placeholder="Select Status"
                value={formData.status as string}
                onchange={handleChangeValue}
                options={[{value: "active", text: "Active"}, {value: "disable", text: "Disabled"}]}
              />
            </div>

            <TextAreaField
              id="description"
              title="Category Description"
              placeholder="Enter Category Description"
              value={formData.description}
              onchange={handleChange}
            />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line bg-raised px-5 py-3.5">
              <button type="button" disabled={isLoading} className="btn btn-ghost" onClick={clearFormData}>
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
                    {isEditing ? 'Updating' : 'Creating'}
                  </>
                ) : (
                  <>{isEditing ? 'Update' : 'Create'} Category</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
