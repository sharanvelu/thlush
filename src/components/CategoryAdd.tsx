import {useEffect, useState} from "react";
import {Category as TypeCategory, CategoryStatus, CategoryDto as TypeCategoryDto} from "@/types/category";
import InputField from "@/components/Inputs/Input";
import TextAreaField from "@/components/Inputs/TextArea";
import SelectField from "@/components/Inputs/Select";
import {ApiResponse as TypeApiResponse} from "@/types/global";

interface CategoryAddProps {
  category?: Partial<TypeCategory | null>;
  isEditing: boolean;
  clearForm: () => void;
  refreshCategories: () => void;
}

export default function CategoryAdd({category, isEditing, clearForm, refreshCategories}: CategoryAddProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);

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
    clearForm();
  }

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

      refreshCategories()
      clearFormData()
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving Category:', error);
      setErrors([error.message || 'An unexpected error occurred']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container mx-auto bg-[#fffbf6] dark:bg-gray-800 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8">
      <h1 className="m-0 mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        Add New Menu Item
      </h1>

      {errors.length > 0 && (
        <div className="flex flex-col gap-2 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6"
             role="alert">
          {errors.map((error: string, index: number) => (
            <p key={index} className="text-sm text-red-700 dark:text-red-300">{error}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
        <InputField
          id="name"
          title="Item Name"
          placeholder="Enter Item Name"
          value={formData.name}
          onchange={handleChange}
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
        title="Item Description"
        placeholder="Enter Item Description"
        value={formData.description}
        onchange={handleChange}
      />

      <div className="flex justify-between">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center bg-linear-120 from-[#28a745] to-[#20c997] text-white border-none rounded-xl py-3 px-6 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{boxShadow: "0 8px 20px rgba(40,167,69,.3)"}}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg"
                   fill="none"
                   viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEditing ? 'Updating' : 'Creating'}
            </>
          ) : (
            <>{isEditing ? 'Update' : 'Create'} Category</>
          )}
        </button>
        <button
          type="button"
          disabled={isLoading}
          className="inline-flex items-center bg-red-400 text-white border-none rounded-xl py-3 px-6 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{boxShadow: "0 8px 20px rgba(40,167,69,.3)"}}
          onClick={clearFormData}
        >
          Clear Form
        </button>
      </div>
    </form>
  );
}