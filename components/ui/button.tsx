import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "border border-cyan-300 bg-cyan-300 text-slate-950 hover:bg-cyan-200",
  secondary: "border border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-400 hover:bg-slate-800",
  ghost: "border border-transparent bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white",
  danger: "border border-rose-400/50 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: "sm" | "md" | "lg";
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5",
        className
      )}
      {...props}
    />
  );
}
