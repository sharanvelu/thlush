import {useEffect, useState} from "react";
import {MenuItem, MenuItemActive, MenuItemDto} from "@/types/menu";
import {useRouter} from 'next/navigation';
import Loader from "@/components/Loader";
import InputField from "@/components/Inputs/Input";
import TextAreaField from "@/components/Inputs/TextArea";
import SelectField from "@/components/Inputs/Select";

interface MenuAddProps {
  menuItem?: Partial<MenuItem | null>;
  isEditing: boolean;
  clearForm: () => void;
}

export default function MenuAdd({menuItem, isEditing, clearForm}: MenuAddProps) {
  const [formData, setFormData] = useState<MenuItemDto>({
    name: menuItem?.name || '',
    description: menuItem?.description || '',
    price: menuItem?.price || 0,
    tax: menuItem?.tax || 0,
    cgst: menuItem?.cgst || 0,
    sgst: menuItem?.sgst || 0,
    currency: menuItem?.currency || '₹',
    status: menuItem?.status || MenuItemActive,
  });

  useEffect(() => {
    setFormData({
      name: menuItem?.name || '',
      description: menuItem?.description || '',
      price: menuItem?.price || 0,
      tax: menuItem?.tax || 0,
      cgst: menuItem?.cgst || 0,
      sgst: menuItem?.sgst || 0,
      currency: menuItem?.currency || '₹',
      status: menuItem?.status || MenuItemActive,
    })
  }, [menuItem]);

  const clearFormData = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      tax: 0,
      cgst: 0,
      sgst: 0,
      currency: '₹',
      status: MenuItemActive,
    });

    clearForm();
  }

  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const {name, value} = e.target;

    handleChangeValue(name, value);
  };

  const handleChangeValue = (name: string, value: string) => {
    setFormData((prev: MenuItemDto) => ({
      ...prev,
      [name]: value,
    }));

    if (name == 'sgst') {
      setFormData((prev: MenuItemDto) => ({
        ...prev,
        ['tax']: parseInt(value) + formData.cgst
      }));
    }

    if (name == 'cgst') {
      setFormData((prev: MenuItemDto) => ({
        ...prev,
        ['tax']: parseInt(value) + formData.sgst
      }));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }

      if (!formData.price) {
        throw new Error('Price is required');
      }

      // Submit to API
      let response;

      // if (isEditing && menuItem?.id) {
      //   // Update existing post
      //   response = await fetch(`/be/api/blogs/${menuItem.id}`, {
      //     method: 'PUT',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify(postData),
      //   });
      // } else {
      //   // Create new post
      //   response = await fetch('/be/api/blogs', {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify(postData),
      //   });
      // }

      // const data = await response.json();

      // if (!data.success) {
      //   throw new Error(data.error || 'Failed to save blog post');
      // }

      // // Navigate back to blogs list
      // router.push('/be/blogs');
      // router.refresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving menu Item:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <Loader/>
    );
  }

  return (
    <form onSubmit={handleSubmit}
          className="bg-[#fffbf6] dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8">
      <h3 className="m-0 mb-5">Add New Menu Item</h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
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
          options={[{value: "active", text: "Active"}, {value: "archive", text: "Archive"}]}
        />
      </div>

      <TextAreaField
        id="description"
        title="Item Description"
        placeholder="Enter Item Description"
        value={formData.description}
        onchange={handleChange}
      />

      <div className="flex gap-4">
        <div className="w-1/3">
          <SelectField
            id="currency"
            title="Currency"
            placeholder="Select Currency"
            value={formData.currency}
            onchange={handleChangeValue}
            options={[{value: "₹", text: "₹"}, {value: "$", text: "$"}]}
          />
        </div>
        <div className="w-2/3">
          <InputField
            id="price"
            title="Item Price"
            placeholder="Enter Item Price"
            value={formData.price}
            onchange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <InputField
          id="sgst"
          title="Item sgst"
          placeholder="Enter Item sgst"
          value={formData.sgst}
          onchange={handleChange}
        />
        <InputField
          id="cgst"
          title="Item cgst"
          placeholder="Enter Item cgst"
          value={formData.cgst}
          onchange={handleChange}
        />
        <InputField
          id="tax"
          title="Item tax"
          disabled={true}
          placeholder="Enter Item tax"
          value={formData.tax}
          onchange={handleChange}
        />
      </div>

      <div className="flex justify-between">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center bg-linear-120 from-[#28a745] to-[#20c997] text-white border-none rounded-xl py-3 px-6 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{boxShadow: "0 8px 20px rgba(40,167,69,.3)"}}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                   viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEditing ? 'Updating' : 'Creating'}
            </>
          ) : (
            <>{isEditing ? 'Update' : 'Create'} Menu Item</>
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