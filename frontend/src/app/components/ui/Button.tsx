import * as React from "react"
import { cn } from "../../utils/cn"

// NOTE: Installing radix-ui/react-slot and class-variance-authority is standard for this pattern,
// but for now I will implement a simpler version if dependencies aren't present, 
// OR I will assume I can install them. 
// Given the "Next.js/Vite" context, these are common. 
// However, to keep it "minimal" as requested ("Fast, minimal"), I will use standard props without extra deps for now
// to avoid bloating unless necessary. Use clsx/tailwind-merge which I already have.

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
    size?: 'sm' | 'md' | 'lg' | 'icon';
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {

        const variants = {
            primary: "bg-brand-red text-white hover:opacity-90 shadow-sm border border-transparent",
            secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm",
            outline: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50",
            ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
            link: "text-brand-red underline-offset-4 hover:underline bg-transparent p-0 h-auto",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-10 px-4 py-2 text-sm",
            lg: "h-12 px-8 text-base",
            icon: "h-10 w-10 p-2 flex items-center justify-center",
        };

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
