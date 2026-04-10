"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { sharesService } from "@/lib/services/shares.service";
import { departmentsService } from "@/lib/services/departments.service";
import { coursesService } from "@/lib/services/courses.service";
import { UserRole } from "@/lib/types";

type ShareTarget = "usuario" | "rol" | "departamento" | "curso" | "link";

const ROLE_LABELS: Record<string, string> = {
  rector: "Rector",
  coordinador: "Coordinador",
  profesor: "Profesor",
  secretario: "Secretario",
  padre: "Padre",
  estudiante: "Estudiante",
  moderador: "Moderador",
  admin: "Administrador",
  user: "Usuario básico",
};

interface Props {
  documentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateShareDialog({ documentId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  // Tipo de destinatario
  const [target, setTarget] = useState<ShareTarget>("usuario");

  // Campos de destino
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");

  // Permisos
  const [canDownload, setCanDownload] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Restricciones
  const [expiresAt, setExpiresAt] = useState("");
  const [maxViews, setMaxViews] = useState("");

  // Link público
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");

  const { data: departmentsData } = useQuery({
    queryKey: ["departments-list"],
    queryFn: () => departmentsService.getAll({ limit: 100 }),
    enabled: open && target === "departamento",
  });

  const { data: coursesData } = useQuery({
    queryKey: ["courses-list"],
    queryFn: () => coursesService.getAll({ limit: 100 }),
    enabled: open && target === "curso",
  });

  const createMutation = useMutation({
    mutationFn: sharesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares-sent"] });
      toast.success("Documento compartido correctamente");
      handleClose();
    },
    onError: () => {
      toast.error("Error al compartir el documento");
    },
  });

  const handleClose = () => {
    setTarget("usuario");
    setUserId("");
    setRole("");
    setDepartmentId("");
    setCourseId("");
    setCanDownload(true);
    setCanEdit(false);
    setCanShare(false);
    setExpiresAt("");
    setMaxViews("");
    setRequiresPassword(false);
    setPassword("");
    onOpenChange(false);
  };

  const handleSubmit = () => {
    const isLink = target === "link";

    if (target === "usuario" && !userId.trim()) {
      toast.error("Ingresa el ID o email del usuario");
      return;
    }
    if (target === "rol" && !role) {
      toast.error("Selecciona un rol");
      return;
    }
    if (target === "departamento" && !departmentId) {
      toast.error("Selecciona un departamento");
      return;
    }
    if (target === "curso" && !courseId) {
      toast.error("Selecciona un curso");
      return;
    }
    if (isLink && requiresPassword && !password.trim()) {
      toast.error("Ingresa una contraseña para el link");
      return;
    }

    createMutation.mutate({
      documentId,
      userId: target === "usuario" ? userId.trim() : undefined,
      role: target === "rol" ? role : undefined,
      departmentId: target === "departamento" ? Number(departmentId) : undefined,
      courseId: target === "curso" ? Number(courseId) : undefined,
      canView: true,
      canDownload: isLink ? true : canDownload,
      canEdit: isLink ? false : canEdit,
      canShare: isLink ? false : canShare,
      isPublicLink: isLink,
      requiresPassword: isLink ? requiresPassword : false,
      password: isLink && requiresPassword ? password : undefined,
      expiresAt: expiresAt || undefined,
      maxViews: maxViews ? Number(maxViews) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartir documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Sección 1: Tipo de destinatario */}
          <div className="space-y-2">
            <Label>Compartir con</Label>
            <div className="grid grid-cols-5 gap-1 rounded-lg border border-border p-1 text-center text-xs">
              {(["usuario", "rol", "departamento", "curso", "link"] as ShareTarget[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`rounded-md px-2 py-1.5 capitalize transition-colors ${
                    target === t
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "link" ? "Link público" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Sección 2: Campos según destino */}
          {target === "usuario" && (
            <div className="space-y-1.5">
              <Label htmlFor="userId">Email o ID del usuario</Label>
              <Input
                id="userId"
                placeholder="usuario@colegio.edu"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          )}

          {target === "rol" && (
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r] ?? r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {target === "departamento" && (
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departmentsData?.data.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {target === "curso" && (
            <div className="space-y-1.5">
              <Label>Curso</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un curso" />
                </SelectTrigger>
                <SelectContent>
                  {coursesData?.data.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {target === "link" && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Se generará un enlace único que cualquiera podrá usar para acceder al documento.
              </p>
              <div className="flex items-center justify-between">
                <Label htmlFor="requires-password" className="cursor-pointer">
                  Proteger con contraseña
                </Label>
                <Switch
                  id="requires-password"
                  checked={requiresPassword}
                  onCheckedChange={setRequiresPassword}
                />
              </div>
              {requiresPassword && (
                <Input
                  type="password"
                  placeholder="Contraseña del link"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Sección 3: Permisos (solo para destinos no-link) */}
          {target !== "link" && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Permisos</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 opacity-60">
                    <Checkbox checked disabled />
                    <span className="text-sm">Ver documento</span>
                    <span className="text-xs text-muted-foreground">(siempre activo)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canDownload"
                      checked={canDownload}
                      onCheckedChange={(v) => setCanDownload(Boolean(v))}
                    />
                    <label htmlFor="canDownload" className="cursor-pointer text-sm">
                      Descargar
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canEdit"
                      checked={canEdit}
                      onCheckedChange={(v) => setCanEdit(Boolean(v))}
                    />
                    <label htmlFor="canEdit" className="cursor-pointer text-sm">
                      Editar
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="canShare"
                      checked={canShare}
                      onCheckedChange={(v) => setCanShare(Boolean(v))}
                    />
                    <label htmlFor="canShare" className="cursor-pointer text-sm">
                      Re-compartir
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sección 4: Restricciones */}
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expiresAt">Expiración</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxViews">Máx. vistas</Label>
              <Input
                id="maxViews"
                type="number"
                min={1}
                placeholder="Sin límite"
                value={maxViews}
                onChange={(e) => setMaxViews(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Compartiendo..." : "Compartir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
