import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "dark" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-lama-red text-white hover:bg-lama-red-dark disabled:bg-lama-red/50",
  outline: "border-2 border-lama-red text-lama-red hover:bg-lama-red-soft",
  dark: "border-2 border-lama-ink text-lama-ink hover:bg-lama-ink hover:text-white",
  ghost: "text-lama-ink hover:bg-lama-cloud",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[10px] font-display font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
