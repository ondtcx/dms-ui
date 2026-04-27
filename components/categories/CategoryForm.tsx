"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sectionsService } from "@/lib/services/sections.service";
import { Category, CreateCategoryDto } from "@/lib/types";
import { UI_COLORS, CATEGORY_ICONS } from "@/lib/constants/ui";
import { derivePrefix } from "@/lib/utils/document-numbering";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";

interface CategoryFormProps {
  initialValues?: Category;
  onSubmit: (data: CreateCategoryDto) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function CategoryForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
}: CategoryFormProps) {
  const [values, setValues] = useState({
    name:           initialValues?.name ?? "",
    description:    initialValues?.description ?? "",
    color:          initialValues?.color ?? "#3b82f6",
    icon:           initialValues?.icon ?? "Folder",
    isActive:       initialValues?.isActive ?? true,
    sectionId:      initialValues?.sectionId ?? null as number | null,
    requiresCourse: initialValues?.requiresCourse ?? false,
    roleIds:        initialValues?.roleIds ?? initialValues?.roles?.map((r) => r.roleId) ?? [] as string[],
    prefix:         initialValues?.prefix ?? "",
  });

  const autoPrefix = derivePrefix(values.name);

  const { data: rolesData } = useRoles();

  // Misma queryKey que el resto de la app → comparte caché sin fetch redundante
  const { data: sectionsResponse } = useQuery({
    queryKey: ["sections", { isActive: true }],
    queryFn: () => sectionsService.getAll({ isActive: true, limit: 100 }),
  });

  const toggleRole = (roleId: string) => {
    setValues((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((r) => r !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const handleSubmit = () => {
    if (!values.name.trim()) return;
    onSubmit({
      name:           values.name.trim(),
      description:    values.description || undefined,
      color:          values.color,
      icon:           values.icon,
      isActive:       values.isActive,
      sectionId:      values.sectionId,
      requiresCourse: values.requiresCourse,
      // array vacío → undefined para que el backend interprete "sin restricción"
      roleIds:        values.roleIds.length > 0 ? values.roleIds : undefined,
      prefix:         values.prefix.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Nombre *</Label>
        <Input
          id="cat-name"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="Ej: Legales, Planificaciones..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-desc">Descripción</Label>
        <Textarea
          id="cat-desc"
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="color"
              value={values.color}
              onChange={(e) => setValues({ ...values, color: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Select
              value={values.color}
              onValueChange={(v) => setValues({ ...values, color: v })}
            >
              <SelectTrigger className="flex-1">
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
              {CATEGORY_ICONS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sección</Label>
        <Select
          value={values.sectionId === null ? "none" : String(values.sectionId)}
          onValueChange={(v) =>
            setValues({ ...values, sectionId: v === "none" ? null : Number(v) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin sección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin sección</SelectItem>
            {sectionsResponse?.data.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cat-course"
            checked={values.requiresCourse}
            onCheckedChange={(c) =>
              setValues({ ...values, requiresCourse: c as boolean })
            }
          />
          <Label htmlFor="cat-course">Requiere curso</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cat-active"
            checked={values.isActive}
            onCheckedChange={(c) =>
              setValues({ ...values, isActive: c as boolean })
            }
          />
          <Label htmlFor="cat-active">Activa</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-prefix">Prefijo de numeración</Label>
        <div className="flex items-center gap-2">
          <Input
            id="cat-prefix"
            value={values.prefix}
            onChange={(e) =>
              setValues({
                ...values,
                prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 6),
              })
            }
            placeholder={autoPrefix || "Ej: PLN"}
            maxLength={6}
            className="w-32 font-mono"
          />
          {autoPrefix && !values.prefix && (
            <span className="text-xs text-muted-foreground">
              Se usará <span className="font-mono font-medium">{autoPrefix}</span> automáticamente
            </span>
          )}
          {values.prefix && (
            <span className="text-xs text-muted-foreground">
              Números como{" "}
              <span className="font-mono font-medium">SEC-{values.prefix}-{new Date().getFullYear()}-0001</span>
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Máx. 6 caracteres. Deja vacío para derivar del nombre automáticamente.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Roles permitidos</Label>
        <p className="text-xs text-muted-foreground">
          Sin selección = acceso para todos los roles
        </p>
        <div className="flex flex-wrap gap-2">
          {rolesData?.map((role) => {
            const selected = values.roleIds.includes(role.id);
            return (
              <Badge
                key={role.id}
                variant={selected ? "default" : "outline"}
                className="cursor-pointer select-none"
                style={selected ? { backgroundColor: values.color } : undefined}
                onClick={() => toggleRole(role.id)}
              >
                {role.name}
              </Badge>
            );
          })}
        </div>
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
              : "Crear Categoría"}
        </Button>
      </DialogFooter>
    </div>
  );
}
