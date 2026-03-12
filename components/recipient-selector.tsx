"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";

const recipients = [
  {
    value: "dep-contabilidad",
    label: "Departamento de Contabilidad",
    type: "department",
  },
  { value: "dep-legal", label: "Departamento Legal", type: "department" },
  { value: "dep-rrhh", label: "Recursos Humanos", type: "department" },
  { value: "dep-operaciones", label: "Operaciones", type: "department" },
  { value: "user-maria", label: "María García", type: "user" },
  { value: "user-carlos", label: "Carlos Rodríguez", type: "user" },
  { value: "user-ana", label: "Ana Martínez", type: "user" },
  { value: "user-pedro", label: "Pedro Sánchez", type: "user" },
];

interface RecipientSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function RecipientSelector({ value, onChange }: RecipientSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleRecipient = (recipientValue: string) => {
    if (value.includes(recipientValue)) {
      onChange(value.filter((v) => v !== recipientValue));
    } else {
      onChange([...value, recipientValue]);
    }
  };

  const selectedLabels = value
    .map((v) => recipients.find((r) => r.value === v)?.label)
    .filter(Boolean);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-expanded={open}
            className="w-full justify-between bg-input text-left font-normal"
          >
            {value.length > 0
              ? `${value.length} destinatario${value.length > 1 ? "s" : ""} seleccionado${value.length > 1 ? "s" : ""}`
              : "Seleccionar destinatarios..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar destinatario..." />
            <CommandList>
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>
              <CommandGroup heading="Departamentos">
                {recipients
                  .filter((r) => r.type === "department")
                  .map((recipient) => (
                    <CommandItem
                      key={recipient.value}
                      value={recipient.value}
                      onSelect={() => toggleRecipient(recipient.value)}
                    >
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      {recipient.label}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value.includes(recipient.value)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandGroup heading="Usuarios">
                {recipients
                  .filter((r) => r.type === "user")
                  .map((recipient) => (
                    <CommandItem
                      key={recipient.value}
                      value={recipient.value}
                      onSelect={() => toggleRecipient(recipient.value)}
                    >
                      <User className="mr-2 h-4 w-4 text-muted-foreground" />
                      {recipient.label}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value.includes(recipient.value)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => {
            const recipient = recipients.find((r) => r.value === v);
            if (!recipient) return null;
            return (
              <Badge key={v} variant="secondary" className="gap-1.5">
                {recipient.type === "department" ? (
                  <Building2 className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                {recipient.label}
                <button
                  type="button"
                  onClick={() => toggleRecipient(v)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20"
                  aria-label={`Eliminar ${recipient.label}`}
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
