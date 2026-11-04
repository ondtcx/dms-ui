"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AuthoringUser } from "@/lib/types/authoring";
import { cn, formatRole } from "@/lib/utils";

interface ReviewerPickerProps {
  id?: string;
  users?: AuthoringUser[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function roleText(user: AuthoringUser): string {
  const labels = (user.roles ?? [])
    .map((role) => role.label)
    .filter((label): label is string => Boolean(label));
  if (labels.length) return labels.join(" · ");
  return formatRole(user.role) || "Sin rol";
}

export function ReviewerPicker({
  id,
  users = [],
  value,
  onChange,
  disabled = false,
  loading = false,
}: ReviewerPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = users.find((user) => user.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-busy={loading || undefined}
          className="h-auto min-h-9 w-full justify-between py-2 text-left"
          disabled={disabled}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selected ? (
              <span className="min-w-0">
                <span className="block truncate text-sm">
                  {selected.name || selected.email}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {selected.email} · {roleText(selected)}
                </span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Cualquier usuario del módulo
              </span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(28rem,calc(100vw-2rem))] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            aria-label="Buscar revisor"
            placeholder="Buscar por nombre, correo o rol…"
          />
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 border-b px-3 py-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando usuarios…
            </div>
          ) : null}
          <CommandList>
            <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="cualquier usuario del modulo"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value ? "opacity-0" : "opacity-100",
                  )}
                />
                <span>Cualquier usuario del módulo</span>
              </CommandItem>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name ?? ""} ${user.email ?? ""} ${roleText(user)}`}
                  onSelect={() => {
                    onChange(user.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {user.name || user.email}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email} · {roleText(user)}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
