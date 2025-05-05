
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"

import { cn } from "@/lib/utils" // Import cn
import { buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area" // Import ScrollArea
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Import Select components

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
    captionLayout?: "buttons" | "dropdown" | "dropdown-buttons"; // Add captionLayout prop
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "buttons", // Default to buttons
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)} // Use cn
      captionLayout={captionLayout} // Pass captionLayout to DayPicker
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: cn(
            "text-sm font-medium",
             captionLayout?.includes("dropdown") && "hidden" // Hide default label when dropdowns are used
        ),
        caption_dropdowns: "flex gap-1", // Style for dropdown container
        nav: "space-x-1 flex items-center",
        nav_button: cn( // Use cn
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn( // Use cn
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md", // Added base styles
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md"
        ),
        day: cn( // Use cn
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start", // Add range start class
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30", // Adjusted opacity
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        // Dropdown styles
        dropdown: "rdp-dropdown bg-transparent px-2 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring", // Base style for dropdown trigger
        dropdown_month: "rdp-dropdown_month", // Specific class for month dropdown
        dropdown_year: "rdp-dropdown_year", // Specific class for year dropdown
        dropdown_icon: "ml-2", // Style for dropdown icon if needed
        ...classNames, // Ensure user-provided classNames override defaults
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
         Dropdown: ({ value, onChange, children, ...rest }: DropdownProps) => { // Custom Dropdown component
          const options = React.Children.toArray(
            children
          ) as React.ReactElement<React.HTMLProps<HTMLOptionElement>>[]
          const selected = options.find((child) => child.props.value === value)
          const handleChange = (newValue: string) => {
            const changeEvent = {
              target: { value: newValue },
            } as React.ChangeEvent<HTMLSelectElement>
            onChange?.(changeEvent)
          }
          return (
            <Select
              value={value?.toString()}
              onValueChange={(newValue) => {
                handleChange(newValue)
              }}
            >
              <SelectTrigger className="h-7 text-xs py-0 pr-1.5 pl-2">
                <SelectValue>{selected?.props?.children}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                 <ScrollArea className={options.length > 10 ? "h-80" : ""}>
                    {options.map((option, id: number) => (
                    <SelectItem
                        key={`${option.props.value}-${id}`}
                        value={option.props.value?.toString() ?? ""}
                    >
                        {option.props.children}
                    </SelectItem>
                    ))}
                 </ScrollArea>
              </SelectContent>
            </Select>
          )
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
