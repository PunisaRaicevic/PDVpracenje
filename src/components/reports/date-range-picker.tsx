'use client'

import { useState } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'
import { Calendar, ChevronDown } from 'lucide-react'

interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onDateChange: (start: Date, end: Date) => void
}

const presets = [
  { label: 'Posljednjih 7 dana', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Posljednjih 30 dana', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'Ovaj mjesec', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: 'Prosli mjesec', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Ova godina', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
]

export function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const handlePresetClick = (preset: typeof presets[0]) => {
    const { start, end } = preset.getValue()
    onDateChange(start, end)
    setShowDropdown(false)
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = new Date(e.target.value)
    if (!isNaN(newStart.getTime())) {
      onDateChange(newStart, endDate)
    }
  }

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = new Date(e.target.value)
    if (!isNaN(newEnd.getTime())) {
      onDateChange(startDate, newEnd)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Start Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={16} />
          <input
            type="date"
            value={format(startDate, 'yyyy-MM-dd')}
            onChange={handleStartDateChange}
            className="pl-10 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-white"
          />
        </div>

        <span className="text-navy-500">-</span>

        {/* End Date */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" size={16} />
          <input
            type="date"
            value={format(endDate, 'yyyy-MM-dd')}
            onChange={handleEndDateChange}
            className="pl-10 pr-3 py-2 bg-navy-800 border border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-white"
          />
        </div>

        {/* Presets Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors text-sm text-navy-300 border border-navy-600"
          >
            Brzi izbor
            <ChevronDown size={16} />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full right-0 mt-1 w-48 bg-navy-800 rounded-lg shadow-lg border border-navy-600 z-20 py-1">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-4 py-2 text-sm text-navy-300 hover:bg-navy-700 hover:text-white transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
