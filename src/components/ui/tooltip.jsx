import * as React from "react"
import { cn } from "@/lib/utils"

const Tooltip = ({ children, content, className, ...props }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      {...props}
    >
      {children}
      {isVisible && content && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-popover-foreground bg-popover border rounded-md shadow-md pointer-events-none",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
            "max-w-xs",
            className
          )}
          style={{
            whiteSpace: 'pre-line'
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-popover"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Tooltip };

