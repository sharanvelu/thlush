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
      <label htmlFor={id} className="field-label">
        {title}
      </label>
      <textarea
        className="field min-h-24"
        id={id}
        name={id}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={onchange}
      ></textarea>
    </div>
  );
}