import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-white/60 bg-gradient-to-b from-[#5a90ff] to-[#1f5cff] text-primary-foreground shadow-[0_3px_0_#1745c0,0_8px_16px_rgb(11_31_77/0.16),inset_0_1px_0_rgb(255_255_255/0.5)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#1745c0,0_3px_8px_rgb(11_31_77/0.14),inset_0_1px_0_rgb(255_255_255/0.5)] [a]:hover:brightness-105",
        cta:
          "border-white/70 bg-gradient-to-b from-[#6a9bff] to-[#1f5cff] text-primary-foreground shadow-[0_4px_0_#1745c0,0_10px_18px_rgb(11_31_77/0.18),inset_0_2px_0_rgb(255_255_255/0.55)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_2px_0_#1745c0,0_4px_8px_rgb(11_31_77/0.15),inset_0_2px_0_rgb(255_255_255/0.55)]",
        orange:
          "border-white/70 bg-gradient-to-b from-[#ffb066] to-[#ff8a1f] text-navy shadow-[0_3px_0_#c9610a,0_8px_16px_rgb(11_31_77/0.16),inset_0_1px_0_rgb(255_255_255/0.55)] hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#c9610a,0_3px_8px_rgb(11_31_77/0.14),inset_0_1px_0_rgb(255_255_255/0.55)]",
        outline:
          "border-border bg-white shadow-[0_2px_0_#d3ddf2] hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
