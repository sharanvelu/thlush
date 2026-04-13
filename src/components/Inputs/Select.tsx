import {useEffect, useRef, useState} from "react";

interface Option {
  value: string | number;
  text: string;
}

interface SelectProps {
  id: string;
  title?: string;
  placeholder: string;
  disabled?: boolean;
  value: string | number | null;
  options: Option[];
  onchange: (name: string, value: string | number) => void;
  titleHelperText?: string;
}

export default function SelectField({id, title, placeholder, disabled, value, options, onchange, titleHelperText}: SelectProps) {
  const [isDropDownOpen, setIsDropDownOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDropDownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropDownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropDownOpen]);

  const toggleDropdown = () => {
    setIsDropDownOpen(!disabled && !isDropDownOpen);
  }

  const closeDropdown = () => {
    setIsDropDownOpen(false);
  }

  const selectOption = (value: string | number) => {
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
    <div className="mb-4 w-full relative" ref={containerRef}>
      {title && (
        <label
          htmlFor={id}
          className="block mb-1.5 font-semibold text-[#1f1f1f]] dark:text-gray-300 text-sm"
          onClick={toggleDropdown}
        >
          {title}
          {(titleHelperText ?? '').trim() !== '' && (
            <span className="px-2 text-xs text-amber-600 dark:text-amber-400 mt-1 mb-0">
              {titleHelperText}
            </span>
          )}
        </label>
      )}
      <div
        className={`flex items-center justify-between w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={toggleDropdown}
      >
        {getDisplayValue()}
        <span className={`transition-all duration-250 ${isDropDownOpen ? '' : 'rotate-180'}`}>
          <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.2929 15.2893C18.6834 14.8988 18.6834 14.2656 18.2929 13.8751L13.4007 8.98766C12.6195 8.20726 11.3537 8.20757 10.5729 8.98835L5.68257 13.8787C5.29205 14.2692 5.29205 14.9024 5.68257 15.2929C6.0731 15.6835 6.70626 15.6835 7.09679 15.2929L11.2824 11.1073C11.673 10.7168 12.3061 10.7168 12.6966 11.1073L16.8787 15.2893C17.2692 15.6798 17.9024 15.6798 18.2929 15.2893Z" fill="#888888"/>
          </svg>
        </span>
      </div>
      {isDropDownOpen && !disabled && (
        <div
          className="absolute z-20 p-2 flex flex-col gap-2 w-full top-20 border border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl shadow-xl">
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