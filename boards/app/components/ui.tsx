import * as React from "react";
import { cn } from "@/app/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-[13px] transition-colors duration-100",
        variant === "primary" && "border-[#5B5BD6] bg-[#5B5BD6] text-white hover:bg-[#4F4FC8]",
        variant === "secondary" && "border-[#EBEBEB] bg-white text-[#141414] hover:bg-[#F4F4F2]",
        variant === "ghost" && "border-transparent bg-transparent text-[#141414] hover:bg-[#F4F4F2]",
        className
      )}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-lg border border-[#EBEBEB] bg-white", className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-9 w-full rounded-md border border-[#EBEBEB] bg-white px-3 text-[13px] outline-none transition-colors placeholder:text-[#888888] focus:border-[#5B5BD6]", className)}
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="h-9 rounded-md border border-[#EBEBEB] bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#5B5BD6]"
      {...props}
    />
  );
}
