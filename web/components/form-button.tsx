"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Disabled while the form saves, so a double click cannot create a record twice.
export default function FormButton({ children, confirmText, quiet }: {
  children: ReactNode;
  confirmText?: string;
  quiet?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={quiet ? "quiet" : undefined}
      disabled={pending}
      onClick={(event) => {
        if (confirmText && !confirm(confirmText)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
