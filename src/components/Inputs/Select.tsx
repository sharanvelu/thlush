import {useEffect, useRef, useState} from "react";
import Icon from "@/components/Icon";

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
        <label htmlFor={id} className="field-label" onClick={toggleDropdown}>
          {title}
          {(titleHelperText ?? '').trim() !== '' && (
            <span className="ml-2 text-[11px] font-normal text-warn">{titleHelperText}</span>
          )}
        </label>
      )}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isDropDownOpen}
        className="field flex items-center justify-between text-left cursor-pointer"
        onClick={toggleDropdown}
      >
        <span className={value ? 'truncate' : 'truncate text-ink-4'}>{getDisplayValue()}</span>
        <Icon name="chevronDown" size={15} className={`shrink-0 text-ink-3 transition-transform duration-150 ${isDropDownOpen ? 'rotate-180' : ''}`}/>
      </button>
      {isDropDownOpen && !disabled && (
        <div role="listbox" className="pop absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-xl bg-raised p-1 shadow-pop" style={{transformOrigin: 'top'}}>
          {options.map((option) => {
            const selected: boolean = option.value == value;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={selected}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] ${selected ? 'bg-accent-soft text-accent font-medium' : 'text-ink hover:bg-sunken'}`}
                onClick={() => selectOption(option.value)}
              >
                {option.text}
                {selected && <Icon name="check" size={14}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
