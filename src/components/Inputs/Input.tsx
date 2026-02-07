import {ChangeEventHandler} from "react";

interface InputProps {
  id: string;
  title: string;
  placeholder: string;
  disabled?: boolean;
  value: string | number | null;
  onchange: ChangeEventHandler<HTMLInputElement>;
}

export default function InputField({id, title, placeholder, disabled, value, onchange}: InputProps) {
  return (
    <div className="mb-4 w-full">
      <label htmlFor={id} className="block mb-1.5 font-semibold text-[#1f1f1f]] dark:text-gray-300 text-sm">
        {title}
      </label>
      <input
        className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
        type="text"
        id={id}
        name={id}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onchange}
      />
    </div>
  );
}