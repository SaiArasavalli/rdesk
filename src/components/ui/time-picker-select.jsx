import * as React from "react"
import { Clock, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function TimePickerSelect({ 
  value, 
  onChange, 
  minTime,
  className, 
  placeholder = "Select time",
  ...props 
}) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState(false)

  // Generate time options (every 15 minutes)
  const generateTimeOptions = () => {
    const times = []
    const minHour = minTime ? parseInt(minTime.split(':')[0]) : 0
    const minMinute = minTime ? parseInt(minTime.split(':')[1]) : 0
    const minTimeMinutes = minHour * 60 + minMinute
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeMinutes = hour * 60 + minute
        if (minTime && timeMinutes < minTimeMinutes) {
          continue
        }
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const date = new Date()
        date.setHours(hour)
        date.setMinutes(minute)
        const displayTime = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        times.push({ value: timeString, display: displayTime })
      }
    }
    return times
  }

  const timeOptions = React.useMemo(() => generateTimeOptions(), [minTime])

  const formatTime = (timeString) => {
    if (!timeString) return ""
    const [hours, minutes] = timeString.split(":")
    const date = new Date()
    date.setHours(parseInt(hours, 10))
    date.setMinutes(parseInt(minutes, 10))
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleTimeSelect = (timeValue) => {
    // Validate if minTime is set
    if (minTime) {
      const [selectedHour, selectedMinute] = timeValue.split(':').map(Number)
      const [minHour, minMinute] = minTime.split(':').map(Number)
      
      const selectedTimeMinutes = selectedHour * 60 + selectedMinute
      const minTimeMinutes = minHour * 60 + minMinute
      
      if (selectedTimeMinutes < minTimeMinutes) {
        setError(true)
        setTimeout(() => {
          setError(false)
          setOpen(false)
        }, 2000)
        return
      }
    }
    
    setError(false)
    onChange({ target: { value: timeValue } })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-10 justify-between font-normal border transition-all bg-white",
            error 
              ? "border-red-500 bg-red-50 animate-pulse" 
              : "hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
            !value && "text-muted-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 opacity-50" />
            {value ? formatTime(value) : <span>{placeholder}</span>}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-1">
            {timeOptions.map((time) => {
              const isDisabled = minTime && (() => {
                const [selectedHour, selectedMinute] = time.value.split(':').map(Number)
                const [minHour, minMinute] = minTime.split(':').map(Number)
                const selectedTimeMinutes = selectedHour * 60 + selectedMinute
                const minTimeMinutes = minHour * 60 + minMinute
                return selectedTimeMinutes < minTimeMinutes
              })()
              
              return (
                <Button
                  key={time.value}
                  variant={value === time.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTimeSelect(time.value)}
                  disabled={isDisabled}
                  className={cn(
                    "justify-start h-9 px-3 text-sm transition-all",
                    value === time.value 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : isDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-blue-50"
                  )}
                >
                  {time.display}
                </Button>
              )
            })}
          </div>
        </div>
        {error && (
          <div className="px-3 py-2 border-t bg-red-50 animate-pulse">
            <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Time cannot be in the past</span>
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

