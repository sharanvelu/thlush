import {ChangeEventHandler, useState} from "react";
import {BillingItem as TypeBillingItem} from "@/types/billing";

interface Option {
  value: string;
  text: string;
}

interface SelectProps {
  id: string;
  title?: string;
  placeholder: string;
  disabled?: boolean;
  value: string | number | null;
  options: Option[];
  onchange: (name: string, value: string) => void;
}

export default function SelectField({id, title, placeholder, disabled, value, options, onchange}: SelectProps) {
  const [isDropDownOpen, setIsDropDownOpen] = useState<boolean>(false);

  const toggleDropdown = () => {
    setIsDropDownOpen(!disabled && !isDropDownOpen);
  }

  const closeDropdown = () => {
    setIsDropDownOpen(false);
  }

  const selectOption = (value: string) => {
    onchange(id, value);

    closeDropdown();
  }

  const getDisplayValue = (): string => {
    if (value) {
      const option: Option | undefined = options.find((x: Option): boolean => x.value === value);

      if (option) return option.text;
    }

    return placeholder || "Please select an Option";
  }

  return (
    <div className="mb-4 w-full relative">
      {title && (
        <label
          htmlFor={id}
          className="block mb-1.5 font-semibold text-[#1f1f1f]] dark:text-gray-300 text-sm"
          onClick={toggleDropdown}
        >
          {title}
        </label>
      )}
      <div
        className={`w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18] ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={toggleDropdown}
      >
        {getDisplayValue()}
      </div>
      {isDropDownOpen && !disabled && (
        <div
          className="absolute z-20 p-2 flex flex-col gap-2 w-full top-20 border border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl">
          {options.map((option) => (
            <div
              key={option.value}
              className={`py-1 px-4 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-900 rounded-xl ${option.value == value ? 'bg-gray-400 dark:bg-gray-900' : 'bg-gray-300 dark:bg-gray-800'}`}
              onClick={() => selectOption(option.value)}
            >
              {option.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}