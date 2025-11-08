import * as React from "react"
import { format } from "date-fns"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { TimePickerSelect } from "@/components/ui/time-picker-select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateTimePicker({ 
  dateValue, 
  timeValue, 
  onDateChange, 
  onTimeChange, 
  minDate,
  minTime,
  datePlaceholder = "Select date",
  timePlaceholder = "Select time",
  className,
  ...props 
}) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState(dateValue ? new Date(dateValue) : undefined)

  React.useEffect(() => {
    if (dateValue) {
      setDate(new Date(dateValue))
    } else {
      setDate(undefined)
    }
  }, [dateValue])

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate)
    if (selectedDate) {
      const dateString = format(selectedDate, "yyyy-MM-dd")
      onDateChange({ target: { value: dateString } })
    }
    setOpen(false)
  }

  const handleTimeChange = (e) => {
    // TimePickerSelect handles validation internally
    onTimeChange(e);
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const min = minDate ? new Date(minDate) : today

  const isDateDisabled = (dateToCheck) => {
    if (!min) return false
    
    // Compare dates by setting time to midnight for accurate comparison
    const checkDate = new Date(dateToCheck)
    checkDate.setHours(0, 0, 0, 0)
    const minDateCopy = new Date(min)
    minDateCopy.setHours(0, 0, 0, 0)
    
    // Disable dates before the minimum date (allow today if min is today)
    return checkDate < minDateCopy
  }
  
  // Get min time for today
  const getMinTime = () => {
    if (!dateValue || !minTime) return undefined;
    
    const selectedDate = new Date(dateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Only apply minTime if selected date is today
    if (selectedDate.getTime() === today.getTime()) {
      return minTime;
    }
    
    return undefined;
  }

  return (
    <div className={cn("flex gap-4", className)} {...props}>
      <div className="flex flex-col gap-2 flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-10 justify-between font-normal border hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
            >
              {date ? date.toLocaleDateString() : <span className="text-muted-foreground">{datePlaceholder}</span>}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              captionLayout="dropdown"
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <TimePickerSelect
          value={timeValue || ""}
          onChange={handleTimeChange}
          minTime={getMinTime()}
          placeholder={timePlaceholder}
        />
      </div>
    </div>
  )
}

