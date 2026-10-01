import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// 8-bit button in the 8bitcn style: square, stepped pixel border, pixel type.
export const buttonVariants = cva(
  "retro pixel-border inline-flex select-none items-center justify-center gap-3 whitespace-nowrap px-6 py-4 text-xs uppercase transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[2px] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [--pb:var(--primary)] hover:bg-[#f0b65c] hover:[--pb:#f0b65c]",
        secondary:
          "bg-secondary text-secondary-foreground [--pb:var(--border)] hover:bg-[#2e3029] hover:text-foreground",
        outline:
          "bg-background text-foreground [--pb:var(--foreground)] hover:bg-secondary",
        ghost:
          "bg-transparent text-muted-foreground shadow-none hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground [--pb:var(--destructive)]",
      },
      size: {
        default: "min-h-12",
        sm: "min-h-10 px-4 py-3 text-[10px]",
        lg: "min-h-14 px-8 py-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export default Button;
