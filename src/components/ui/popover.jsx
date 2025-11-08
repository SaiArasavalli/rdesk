import * as React from "react"
import { cn } from "@/lib/utils"

const Popover = ({ open, onOpenChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(open || false)
  const containerRef = React.useRef(null)

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        onOpenChange?.(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onOpenChange])

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <div ref={containerRef} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === PopoverTrigger) {
            return React.cloneElement(child, { 
              onClick: () => handleOpenChange(!isOpen),
              "data-open": isOpen 
            })
          }
          if (child.type === PopoverContent) {
            return isOpen ? React.cloneElement(child) : null
          }
        }
        return child
      })}
    </div>
  )
}

const PopoverTrigger = React.forwardRef(({ asChild, className, children, onClick, ...props }, ref) => {
  const handleClick = (e) => {
    onClick?.(e)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { 
      ref, 
      onClick: handleClick,
      ...props 
    })
  }
  return (
    <div ref={ref} className={cn("", className)} onClick={handleClick} {...props}>
      {children}
    </div>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverContent = React.forwardRef(({ className, align = "start", side = "bottom", children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 rounded-md border bg-white p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        align === "start" && "left-0",
        align === "end" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        side === "bottom" && "top-full",
        side === "top" && "bottom-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }

