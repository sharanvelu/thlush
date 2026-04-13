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
      <label htmlFor={id} className="block mb-1.5 font-semibold text-[#1f1f1f]] dark:text-gray-300 text-sm">
        {title}
      </label>
      <input
        className={`w-full p-3 border-2 border-solid border-[#e0d7cf] dark:border-gray-700 text-[#1f1f1f] dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl text-[15px] focus:outline-none focus:border-[#ff7a18] ${clearButton ? 'pr-10' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
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
          className="absolute right-0 top-7 py-2.75 px-4 text-[#1f1f1f] dark:text-gray-300 cursor-pointer hover:text-orange-300"
          onClick={() => onchange(id, "")}
        >
          <svg width="25px" height="25px" viewBox="0 0 24 24" fill="#888" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M6.99486 7.00636C6.60433 7.39689 6.60433 8.03005 6.99486 8.42058L10.58 12.0057L6.99486 15.5909C6.60433 15.9814 6.60433 16.6146 6.99486 17.0051C7.38538 17.3956 8.01855 17.3956 8.40907 17.0051L11.9942 13.4199L15.5794 17.0051C15.9699 17.3956 16.6031 17.3956 16.9936 17.0051C17.3841 16.6146 17.3841 15.9814 16.9936 15.5909L13.4084 12.0057L16.9936 8.42059C17.3841 8.03007 17.3841 7.3969 16.9936 7.00638C16.603 6.61585 15.9699 6.61585 15.5794 7.00638L11.9942 10.5915L8.40907 7.00636C8.01855 6.61584 7.38538 6.61584 6.99486 7.00636Z"/>
          </svg>
        </button>
      )}
    </div>
  );
}
