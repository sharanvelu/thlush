interface InputProps {
  id: string;
  title: string;
  placeholder: string;
  disabled?: boolean;
  value: number | null;
  min?: number;
  max?: number;
  onchange: (name: string, value: number) => void;
}

export default function NumberField({id, title, placeholder, disabled, value, min, max, onchange}: InputProps) {
  const changeValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = e.target;

    if (value == '') {
      setValue(0);
    }

    if (parseFloat(value)) {
      setValue(parseFloat(value));
    }
  }

  const setValue = (value: number) => {
    const minAllowed: number = min || 0;
    const maxAllowed: number = max || 999999;

    onchange(id, Math.min(maxAllowed, Math.max(minAllowed, value)));
  }

  return (
    <div className="mb-4 w-full">
      <label htmlFor={id} className="field-label">
        {title}
      </label>
      <input
        className="field num"
        type="text"
        id={id}
        name={id}
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={changeValue}
      />
    </div>
  );
}