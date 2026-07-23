import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-on-primary shadow-[0_0_15px_rgba(221,183,255,0.3)] hover:shadow-[0_0_20px_rgba(221,183,255,0.5)]",
  secondary: "glass text-secondary hover:bg-white/10",
  danger: "bg-error text-on-error hover:brightness-110",
  ghost: "bg-transparent text-on-surface-variant hover:bg-white/5",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2.5 rounded-xl font-display font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
