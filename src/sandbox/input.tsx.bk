import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref
) {
  const base =
    "w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-base shadow-sm " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-700";
  return <input ref={ref} className={`${base} ${className}`} {...props} />;
});
