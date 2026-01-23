import {useState} from "react";
import {MenuItem, MenuItemDto} from "@/types/menu";
import {useRouter} from 'next/navigation';
import Loader from "@/components/Loader";
import InputField from "@/components/Inputs/Input";
import TextAreaField from "@/components/Inputs/TextArea";

interface MenuAddProps {
  menuItem?: Partial<MenuItem>;
  isEditing?: boolean;
}

export default function MenuAdd({menuItem, isEditing}: MenuAddProps) {
  const [formData, setFormData] = useState<MenuItemDto>({
    name: menuItem?.name || '',
    description: menuItem?.description || '',
    price: menuItem?.price || 0,
    tax: menuItem?.tax || 0,
    cgst: menuItem?.cgst || 0,
    sgst: menuItem?.sgst || 0,
    currency: menuItem?.currency || ''
  });

  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const {name, value} = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


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

      <InputField
        id="name"
        title="Item Name"
        placeholder="Enter Item Name"
        value={formData.name}
        onchange={handleChange}
      />

      <TextAreaField
        id="description"
        title="Item Description"
        placeholder="Enter Item Description"
        value={formData.description}
        onchange={handleChange}
      />

      <InputField
        id="price"
        title="Item Price"
        placeholder="Enter Item Price"
        value={formData.price}
        onchange={handleChange}
      />

      <InputField
        id="tax"
        title="Item tax"
        placeholder="Enter Item tax"
        value={formData.tax}
        onchange={handleChange}
      />

      <div className="flex gap-3">
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
      </div>
    </form>
  );
}