import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value?: number; max?: number }
>(({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div
            ref={ref}
            className={cn(
                "relative h-3 w-full overflow-hidden rounded-full bg-slate-200",
                className
            )}
            {...props}
        >
            <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
});
Progress.displayName = "Progress";

export { Progress };
