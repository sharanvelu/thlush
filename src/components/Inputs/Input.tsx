import Icon from "@/components/Icon";

interface InputProps {
  id: string;
  title: string;
  placeholder: string;
  disabled?: boolean;
  value: string | number | null;
  onchange: (name: string, value: string | number) => void;
  clearButton?: boolean
}

export default function InputField({id, title, placeholder, disabled, value, onchange, clearButton}: InputProps) {
  return (
    <div className="mb-4 w-full relative">
      <label htmlFor={id} className="field-label">{title}</label>
      <input
        className={`field ${clearButton ? 'pr-9' : ''}`}
        type="text"
        id={id}
        name={id}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={e => onchange(id, e.target.value.trimStart())}
      />
      {clearButton && ((value + '').trim() !== '') && (
        <button
          type="button"
          aria-label="Clear"
          className="absolute right-1.5 bottom-1 grid size-7 place-items-center rounded-md text-ink-3 hover:bg-line hover:text-ink"
          onClick={() => onchange(id, "")}
        >
          <Icon name="x" size={14}/>
        </button>
      )}
    </div>
  );
}
