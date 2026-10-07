import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

// Chunky "pressable" buttons: a hard bottom edge that the button sinks
// into when pressed, instead of a glow.
const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-on-primary shadow-[0_4px_0_#b8901f] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_#b8901f]",
  secondary:
    "border-[1.5px] border-on-surface/15 bg-surface-container-high text-on-surface shadow-[0_4px_0_#0d1511] hover:bg-surface-container-highest active:translate-y-[3px] active:shadow-[0_1px_0_#0d1511]",
  danger:
    "bg-error text-on-error shadow-[0_4px_0_#a3271a] active:translate-y-[3px] active:shadow-[0_1px_0_#a3271a]",
  ghost: "bg-transparent text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-xl px-4 py-2.5 font-display font-bold transition-[transform,box-shadow,background-color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
