import React, { useState } from "react";
import { cn } from "../../lib/utils";

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalValue;

  const handleValueChange = (nextValue) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <div className={cn("w-full", className)} data-value={activeTab}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              activeTab,
              onValueChange: handleValueChange,
            })
          : child
      )}
    </div>
  );
}

export function TabsList({ className, children, activeTab, onValueChange }) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { activeTab, onValueChange })
          : child
      )}
    </div>
  );
}

export function TabsTrigger({
  value,
  activeTab,
  onValueChange,
  className,
  children,
}) {
  const isActive = activeTab === value;
  return (
    <button
      type="button"
      onClick={() => onValueChange?.(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "hover:text-foreground/80",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, activeTab, className, children }) {
  if (value !== activeTab) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
}
