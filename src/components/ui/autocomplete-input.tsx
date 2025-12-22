"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder = "Ketik atau pilih...",
  emptyMessage = "Tidak ada opsi",
  id,
  disabled,
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync internal state with external value
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on input
  const filteredOptions = React.useMemo(() => {
    if (!inputValue.trim()) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    if (!open) {
      setOpen(true);
    }
  };

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue);
    onChange(selectedValue);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    // Always open on focus if there are options
    if (options.length > 0) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown" && !open && options.length > 0) {
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        ref={inputRef}
        id={id}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-4 text-center text-sm text-muted-foreground">
                {inputValue ? emptyMessage : "Ketik untuk mencari..."}
              </div>
            ) : (
              <div className="py-1">
                {filteredOptions.slice(0, 15).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseDown={(e) => e.preventDefault()}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      value === option && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 flex-shrink-0",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option}</span>
                  </button>
                ))}
                {filteredOptions.length > 15 && (
                  <div className="py-2 text-center text-xs text-muted-foreground border-t">
                    +{filteredOptions.length - 15} lainnya...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
