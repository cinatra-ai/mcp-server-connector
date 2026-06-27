import * as React from "react";

import { cn } from "../../lib/utils";

// Self-contained shadcn-style native select primitive (vendored into
// components/ui so the raw-<select> ban exempts it).
//
// The host renders the scope selector with the radix-portal <Select>; this
// extension uses a native <select> wrapper instead to keep the dependency
// footprint identical to the twenty/plane connector mirrors (no radix / lucide /
// class-variance-authority). It carries the same shadcn semantic-token chrome
// and the same `name`/`defaultValue` form contract, so it submits identically
// inside a server-action <form>. Semantic tokens only.

function SelectField({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select-field"
      className={cn(
        "flex h-8 w-full items-center justify-between rounded-md border border-input bg-surface-strong px-2.5 text-sm font-normal text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

function SelectFieldOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="select-field-option" {...props} />;
}

export { SelectField, SelectFieldOption };
