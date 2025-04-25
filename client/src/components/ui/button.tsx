import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from '@/lib/utils/utils'

const buttonVariants = cva(
  "inline-flex items-center otline-none justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:bg-gray-150 dark:disabled:bg-gray-800 disabled:text-gray-600 dark:disabled:text-gray-400 disabled:border disabled:border-input",
  {
    variants: {
      variant: {
        default: 
          "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-accent dark:hover:bg-accent/20",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        warning:
          "bg-[#F97316] text-black hover:bg-[#F97316]/90 dark:bg-[#FB923C] dark:hover:bg-[#FB923C]/90",
        error:
          "bg-[#DC2626] text-white hover:bg-[#DC2626]/90 dark:bg-[#EF4444] dark:hover:bg-[#EF4444]/90",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
      } as const,
      size: {
        icon: "h-8 w-8 p-0 rounded-full",
        sm: "h-[34px] px-4 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
      },
      rounded: {
        default: "rounded-md",
        full: "rounded-full",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      rounded: "default"
    },
  }
)

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  variant?: ButtonVariant
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  tooltip?: string | React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, asChild = false, loading, leftIcon, rightIcon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const button = (
      <Comp
        className={cn(buttonVariants({ variant, size, rounded, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {!loading && leftIcon && <span className="mr-3">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-3">{rightIcon}</span>}
      </Comp>
    )

    return button
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }