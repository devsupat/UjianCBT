import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Input Component - CBT Admin 2.0
 * Designed for teachers aged 35-50
 * - Tall height (h-11) for easy clicking
 * - Large text (text-base)
 * - Clear focus states
 */

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    // Base
                    "flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-base text-gray-900",
                    // Placeholder
                    "placeholder:text-gray-400",
                    // Focus
                    "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                    // Disabled
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
                    // File inputs
                    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                    // Transition
                    "transition-all duration-200",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
