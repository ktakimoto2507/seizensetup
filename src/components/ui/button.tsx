"use client";

import React, { isValidElement, cloneElement } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** <Button asChild><Link/></Button> のように子要素をボタン化 */
  asChild?: boolean;
};

export function Button({ asChild = false, className = "", children, ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-base " +
    "bg-green-600 text-white hover:opacity-90 disabled:opacity-50 focus:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-700";

  if (asChild && isValidElement(children)) {
    // 子要素（例: <Link>）に className や aria を合成して返す
    const child = children as React.ReactElement<any>;
    const merged = [base, child.props.className, className].filter(Boolean).join(" ");
    return cloneElement(child, { className: merged, ...rest });
  }

  return (
    <button {...rest} className={`${base} ${className}`}>
      {children}
    </button>
  );
}
