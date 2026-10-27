"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DemoButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="dark" disabled={pending} className="shrink-0">
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}
