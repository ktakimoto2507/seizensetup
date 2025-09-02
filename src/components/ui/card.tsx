import React from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white shadow p-4 ${className}`}>{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 font-semibold">{children}</div>;
}

export function CardContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}
