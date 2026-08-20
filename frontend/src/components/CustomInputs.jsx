const TextInput = ({
  label,
  name,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
}) => (
  <div className="flex items-center">
    <label
      className="w-2/5 text-xs font-medium 
      // 👇 Dark mode text color for label
      text-gray-700 dark:text-gray-300 text-right pr-3"
    >
      {required && <span className="text-red-500 mr-1">*</span>} {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`flex-1 border 
      border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
      bg-white dark:bg-gray-700 dark:text-gray-200 
      focus:ring-1 focus:ring-blue-500 focus:border-blue-500
      ${
        disabled
          ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
          : ""
      }`}
    />
  </div>
);
const SelectInput = ({
  label,
  name,
  required = false,
  options = [],
  value,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center">
    <label
      className="w-2/5 text-xs font-medium 
      text-gray-700 dark:text-gray-300 text-right pr-3"
    >
      {required && <span className="text-red-500 mr-1">*</span>} {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`flex-1  
       border
      border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 

      bg-white dark:bg-gray-700 dark:text-gray-200
      focus:ring-1 focus:ring-blue-500 focus:border-blue-500
      ${
        disabled
          ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
          : ""
      }`}
    >
      <option value="">Select {label}</option>
      {(options || []).map((option, index) => (
        <option key={index} value={option.value || option.label}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
const CheckboxInput = ({
  label,
  name,
  checked,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center">
    <label
      className="w-2/5 text-xs font-medium 
      text-gray-700 dark:text-gray-300 text-right pr-3"
    >
      {label}
    </label>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className={`w-3 h-3 text-blue-600 
      border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-blue-500 
      ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    />
  </div>
);
const CheckboxSelectInput = ({
  label,
  checkName,
  checkValue,
  selectName,
  selectValue,
  options = [],
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center">
    <label
      className="w-2/5 text-xs font-medium 
      text-gray-700 dark:text-gray-300 text-right pr-3"
    >
      {label}
    </label>
    <div className="flex-1 flex items-center gap-3">
      <input
        type="checkbox"
        name={checkName}
        checked={checkValue}
        onChange={onChange}
        disabled={disabled}
        className={`w-3 h-3 text-blue-600 
        border-gray-300 dark:border-gray-500 rounded focus:ring-1 focus:ring-blue-500 
        ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      />

      <select
        name={selectName}
        value={selectValue}
        onChange={onChange}
        disabled={!checkValue || disabled}
        className={`flex-1 border 
        border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
        // 👇 Dark mode select background and text color
        bg-white dark:bg-gray-700 dark:text-gray-200
        focus:ring-1 focus:ring-blue-500 focus:border-blue-500
        ${
          !checkValue || disabled
            ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
            : ""
        }`}
      >
        <option value="">Select</option>
        {options.map((option, index) => (
          <option key={index} value={option.value || option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  </div>
);
const DualTextInput = ({
  label,
  name1,
  value1,
  name2,
  value2,
  onChange,
  disabled = false,
}) => (
  <div className="flex items-center">
    <label
      className="w-2/5 text-xs font-medium 
      text-gray-700 dark:text-gray-300 text-right pr-3"
    >
      {label}
    </label>
    <div className="flex-1 flex items-center gap-2">
      <input
        type="number"
        name={name1}
        value={value1}
        onChange={onChange}
        placeholder="Min"
        disabled={disabled}
        className={`w-1/2 border 
        border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
        // 👇 Dark mode input background and text color
        bg-white dark:bg-gray-700 dark:text-gray-200
        focus:ring-1 focus:ring-blue-500 focus:border-blue-500
        ${
          disabled
            ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
            : ""
        }`}
      />
      <input
        type="number"
        name={name2}
        value={value2}
        onChange={onChange}
        placeholder="Max"
        disabled={disabled}
        className={`w-1/2 border 
        border-gray-300 dark:border-gray-600 rounded-sm p-1 text-xs 
        // 👇 Dark mode input background and text color
        bg-white dark:bg-gray-700 dark:text-gray-200
        focus:ring-1 focus:ring-blue-500 focus:border-blue-500
        ${
          disabled
            ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
            : ""
        }`}
      />
    </div>
  </div>
);

export {
  TextInput,
  CheckboxInput,
  CheckboxSelectInput,
  DualTextInput,
  SelectInput,
};
