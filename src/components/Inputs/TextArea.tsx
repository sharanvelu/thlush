import {ChangeEventHandler} from "react";

interface InputProps {
  id: string;
  title: string;
  placeholder: string;
  value: string | number | null;
  onchange: ChangeEventHandler<HTMLTextAreaElement>;
}

export default function TextAreaField({id, title, placeholder, value, onchange}: InputProps) {
  return (
    <div className="mb-4">
      <label htmlFor="name" className="block mb-1.5 font-semibold text-[#1f1f1f]] dark:text-gray-300 text-sm">
        {title}
      </label>
      <textarea
        className="w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-600 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18]"
        id={id}
        name={id}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onchange}
      ></textarea>
    </div>
  );
}