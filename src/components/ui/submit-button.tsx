"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/** A submit button that shows progress while its parent <form> action runs. */
export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" pending={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
