import {useEffect, useState} from "react";
import {MenuItem, MenuItemStatus, MenuItemDto} from "@/types/menu";
import {useRouter} from 'next/navigation';
import Loader from "@/components/Loader";
import InputField from "@/components/Inputs/Input";
import TextAreaField from "@/components/Inputs/TextArea";
import SelectField from "@/components/Inputs/Select";
import NumberField from "@/components/Inputs/Number";
import {calculateTotalTaxValue, calculateTotalValue, shouldIgnoreTax} from "@/helpers";
import {ApiListResponse as TypeApiListResponse} from "@/types/global";
import {Category as TypeCategory} from "@/types/category";

interface MenuAddProps {
  menuItem?: Partial<MenuItem | null>;
  isEditing: boolean;
  clearForm: () => void;
}

export default function MenuAdd({menuItem, isEditing, clearForm}: MenuAddProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [categories, setCategories]= useState<TypeCategory[]>([]);

  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [formData, setFormData] = useState<MenuItemDto>({
    name: menuItem?.name || '',
    description: menuItem?.description || '',
    category_id: menuItem?.category_id || null,
    price: menuItem?.price || 0,
    cgst: menuItem?.cgst || 0,
    sgst: menuItem?.sgst || 0,
    currency: menuItem?.currency || '₹',
    status: menuItem?.status || MenuItemStatus.ACTIVE,
  });

  useEffect(() => {
    setFormData({
      name: menuItem?.name || '',
      description: menuItem?.description || '',
      category_id: menuItem?.category_id || null,
      price: menuItem?.price || 0,
      cgst: menuItem?.cgst || 0,
      sgst: menuItem?.sgst || 0,
      currency: menuItem?.currency || '₹',
      status: menuItem?.status || MenuItemStatus.ACTIVE,
    })
  }, [menuItem]);

  const clearFormData = () => {
    setFormData({
      name: '',
      description: '',
      category_id: null,
      price: 0,
      cgst: 0,
      sgst: 0,
      currency: '₹',
      status: MenuItemStatus.ACTIVE,
    });

    setErrors([]);
    clearForm();
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const {name, value} = e.target;

    handleChangeValue(name, value);
  };

  const handleChangeValue = (name: string, value: string | number): void => {
    if (name == 'total') {
      const totalTax: number = calculateTotalTaxValue(formData.sgst, formData.cgst);

      setFormData((prev: MenuItemDto) => ({
        ...prev,
        ['price']: parseFloat((parseFloat(value + '') / (1 + (totalTax / 100))).toFixed(2)),
      }));

      return;
    }

    setFormData((prev: MenuItemDto) => ({
      ...prev,
      [name]: value,
    }));

  }

  const validateData = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.price || formData.price <= 0) errors.push('Price is required');
    if (!formData.sgst || formData.sgst <= 0) errors.push('SGST is required');
    if (!formData.cgst || formData.cgst <= 0) errors.push('CGST is required');
    if (!formData.category_id) errors.push('Category is required');

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
      if (isEditing && menuItem?.id) {
        response = await fetch(`/api/menu/${menuItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new menu item
        response = await fetch('/api/menu', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save menu item');
      }

      router.refresh();
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving menu Item:', error);
      setErrors([error.message || 'An unexpected error occurred']);
    } finally {
      setIsLoading(false);
    }
  };

  async function getCategories(): Promise<void> {
    const response: Response = await fetch(`/api/categories`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });

    const data: TypeApiListResponse<TypeCategory> = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch blog post');
    }

    setCategories(data.data);
  }

  useEffect(() => {
    getCategories().then(r => console.log(r));
  }, []);


  if (isPageLoading) {
    return (
      <Loader/>
    );
  }

  return (
    <form onSubmit={handleSubmit}
          className="bg-[#fffbf6] dark:bg-gray-900 border-2 border-solid border-[#f0e6dd] dark:border-gray-700 rounded-2xl p-6 mb-8">
      <h3 className="m-0 mb-5">Add New Menu Item</h3>

      {errors.length > 0 && (
        <div className="flex flex-col gap-2 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-6"
             role="alert">
          {errors.map((error: string, index: number) => (
            <p key={index} className="text-sm text-red-700 dark:text-red-300">{error}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
        <InputField
          id="name"
          title="Item Name"
          placeholder="Enter Item Name"
          value={formData.name}
          onchange={handleChange}
        />
        <SelectField
          id="category_id"
          title="Category"
          placeholder="Select Category"
          value={formData.category_id}
          onchange={handleChangeValue}
          options={categories.map((category: TypeCategory)=> {
            return {value: category.id, text: category.name}
          })}
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-4 md:w-4/12">
          <div className="w-1/4">
            <SelectField
              id="currency"
              title="Currency"
              placeholder="Select Currency"
              value={formData.currency}
              onchange={handleChangeValue}
              options={[{value: "₹", text: "₹"}, {value: "$", text: "$"}]}
            />
          </div>
          <div className="w-3/4 grow">
            <NumberField
              id="price"
              title="Item Price"
              placeholder="Enter Item Price"
              value={formData.price}
              onchange={handleChangeValue}
            />
          </div>
        </div>
        {!shouldIgnoreTax() && (
          <>
            <div className="flex flex-row gap-4 md:w-5/12">
              <div className="w-1/3 md:w-1/5">
                <NumberField
                  id="sgst"
                  title="SGST"
                  placeholder="Enter SGST"
                  value={formData.sgst || 0}
                  onchange={handleChangeValue}
                  min={0}
                  max={100}
                />
              </div>
              <div className="w-1/3 md:w-1/5">
                <NumberField
                  id="cgst"
                  title="CGST"
                  placeholder="Enter CGST"
                  value={formData.cgst || 0}
                  onchange={handleChangeValue}
                  min={0}
                  max={100}
                />
              </div>
              <div className="w-1/3 md:w-2/5">
                <NumberField
                  id="tax"
                  title="Total Tax"
                  placeholder="Total Tax"
                  disabled={true}
                  value={calculateTotalTaxValue(formData.cgst, formData.sgst)}
                  onchange={() => {}}
                />
              </div>
            </div>
            <div className="md:w-3/12">
              <NumberField
                id="total"
                title="Item Total"
                placeholder="Enter Item Total Price"
                value={calculateTotalValue(formData.price, formData.cgst, formData.sgst)}
                onchange={handleChangeValue}
              />
            </div>
          </>
        )}
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