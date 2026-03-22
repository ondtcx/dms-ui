"use client";

import { useState } from "react";
import { CreateSectionDto, Section } from "@/lib/types";
import { UI_COLORS, SECTION_ICONS } from "@/lib/constants/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

interface SectionFormProps {
  initialValues?: Section;
  onSubmit: (data: CreateSectionDto) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function SectionForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
}: SectionFormProps) {
  const [values, setValues] = useState({
    name:        initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    color:       initialValues?.color ?? "#10b981",
    icon:        initialValues?.icon ?? "FolderOpen",
    isActive:    initialValues?.isActive ?? true,
  });

  const handleSubmit = () => {
    if (!values.name.trim()) return;
    onSubmit({
      name:        values.name.trim(),
      description: values.description || undefined,
      color:       values.color,
      icon:        values.icon,
      isActive:    values.isActive,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="section-name">Nombre *</Label>
        <Input
          id="section-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="Ej: Académico, Administrativo..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="section-desc">Descripción</Label>
        <Textarea
          id="section-desc"
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          placeholder="Descripción de la sección (opcional)"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Color</Label>
          <Select
            value={values.color}
            onValueChange={(v) => setValues({ ...values, color: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UI_COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: c.value }}
                    />
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Icono</Label>
          <Select
            value={values.icon}
            onValueChange={(v) => setValues({ ...values, icon: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTION_ICONS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="section-active"
          checked={values.isActive}
          onCheckedChange={(checked) =>
            setValues({ ...values, isActive: checked as boolean })
          }
        />
        <Label htmlFor="section-active">Sección activa</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending || !values.name.trim()}
        >
          {isPending
            ? "Guardando..."
            : initialValues
              ? "Actualizar"
              : "Crear Sección"}
        </Button>
      </DialogFooter>
    </div>
  );
}
