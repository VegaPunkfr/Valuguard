"use client";

export default function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  mono = false,
  style,
}: {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  mono?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div>
      {label && <label className="gt-label">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`gt-input ${mono ? "gt-input-mono" : ""}`}
        style={style}
      />
    </div>
  );
}
