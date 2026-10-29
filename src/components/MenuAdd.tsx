import {useEffect, useState} from "react";
import Icon from "@/components/Icon";
import {MenuItem as TypeMenuItem, MenuItemStatus, MenuItemDto as TypeMenuItemDto} from "@/types/menu";
import {Category as TypeCategory} from "@/types/category";
import InputField from "@/components/Inputs/Input";
import TextAreaField from "@/components/Inputs/TextArea";
import SelectField from "@/components/Inputs/Select";
import NumberField from "@/components/Inputs/Number";
import {calculateTotalTaxValue, calculateTotalValue, shouldIgnoreTax} from "@/helpers";
import {ApiListResponse as TypeApiListResponse, ApiResponse as TypeApiResponse} from "@/types/global";
import toast from "react-hot-toast";

interface MenuAddProps {
  menuItem?: Partial<TypeMenuItem | null>;
  isEditing: boolean;
  clearForm: () => void;
  refreshMenuItems: () => void;
}

export default function MenuAdd({menuItem, isEditing, clearForm, refreshMenuItems}: MenuAddProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [categories, setCategories] = useState<TypeCategory[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isVisible: boolean = isOpen || isEditing;

  const [total, setTotal] = useState<number>(0);
  const [formData, setFormData] = useState<TypeMenuItemDto>({
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
    if (name == 'total') {
      const totalTax: number = calculateTotalTaxValue(formData.sgst, formData.cgst);

      setTotal(parseFloat(value + '') || 0);

      setFormData((prev: TypeMenuItemDto) => ({
        ...prev,
        ['price']: parseFloat((parseFloat(value + '') / (1 + (totalTax / 100))).toFixed(2)),
      }));

      return;
    }

    if (name == 'price') {
      setTotal(calculateTotalValue(value, formData.sgst, formData.cgst));
    }

    if (name == 'sgst' || name == 'cgst') {
      setTotal(calculateTotalValue(formData.price, value, name == 'sgst' ? formData.cgst : formData.sgst));
    }

    setFormData((prev: TypeMenuItemDto) => ({
      ...prev,
      [name]: value,
    }));
  }

  const validateData = () => {
    const errors: string[] = [];

    if (!formData.name.trim()) errors.push('Name is required');
    if (!formData.price || formData.price <= 0) errors.push('Price is required');
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

      const data: TypeApiResponse<TypeMenuItem> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save menu item');
      }

      toast.success(isEditing ? 'Menu item updated successfully!' : 'Menu item created successfully!');
      refreshMenuItems()
      clearFormData()
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving menu Item:', error);
      toast.error(error.message || 'An unexpected error occurred');
      setErrors([error.message || 'An unexpected error occurred']);
    } finally {
      setIsLoading(false);
    }
  };

  async function getCategories(): Promise<void> {
    const response: Response = await fetch(`/api/categories`, {
      next: {revalidate: 3600} // Revalidate every hour
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

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setIsOpen(true)}>
        <Icon name="plus" size={16}/>
        Add menu item
      </button>

      {isVisible && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={clearFormData}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
            className="pop flex h-full w-full max-w-[560px] flex-col bg-raised shadow-pop"
            style={{transformOrigin: 'right center'}}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.01em]">{isEditing ? 'Edit' : 'Add'} Menu Item</h2>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
              <InputField
                id="name"
                title="Item Name"
                placeholder="Enter Item Name"
                value={formData.name}
                onchange={handleChangeValue}
              />
              <SelectField
                id="category_id"
                title="Category"
                placeholder="Select Category"
                value={formData.category_id}
                onchange={handleChangeValue}
                options={categories.map((category: TypeCategory) => {
                  return {value: category.id, text: category.name}
                })}
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
                        onchange={() => {
                        }}
                      />
                    </div>
                  </div>
                  <div className="md:w-3/12">
                    <NumberField
                      id="total"
                      title="Item Total"
                      placeholder="Enter Item Total Price"
                      value={total}
                      onchange={handleChangeValue}
                    />
                  </div>
                </>
              )}
            </div>
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
                  <>{isEditing ? 'Update' : 'Create'} Menu Item</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
