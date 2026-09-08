"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Upload, Building2 } from "lucide-react";
import { settingsService, InstitutionSettings } from "@/lib/services/settings.service";
import { useSettings } from "@/lib/contexts/SettingsContext";

export function InstitutionForm() {
  const { settings, refresh } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const institution = settings?.institution ?? {
    name: "",
    logoPath: null,
    address: null,
    phone: null,
    email: null,
    website: null,
  };

  const [form, setForm] = useState<InstitutionSettings>(institution);

  // Sync when settings load
  useEffect(() => {
    if (settings?.institution) setForm(settings.institution);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<InstitutionSettings>) => settingsService.updateInstitution(data),
    onSuccess: () => {
      toast.success("Datos de la institución actualizados");
      refresh();
    },
    onError: () => toast.error("Error al actualizar institución"),
  });

  const logoMutation = useMutation({
    mutationFn: (file: File) => settingsService.updateLogo(file),
    onSuccess: (data) => {
      toast.success("Logo actualizado");
      setLogoPreview(null);
      refresh();
      const updated = { ...form, logoPath: data.logoPath };
      setForm(updated);
    },
    onError: () => toast.error("Error al subir el logo"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    logoMutation.mutate(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { logoPath, ...dataToSend } = form;
    updateMutation.mutate(dataToSend);
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "";
  const logoSrc = logoPreview ?? (form.logoPath ? `${apiBase}${form.logoPath}` : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Institución
        </CardTitle>
        <CardDescription>Información general de la institución educativa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-10 w-10 text-gray-300" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Logo institucional</p>
             <p className="text-xs text-gray-500">PNG, JPG o SVG. Tamaño máximo: 5 MB.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {logoMutation.isPending ? "Subiendo..." : "Cambiar logo"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inst-name">Nombre de la institución *</Label>
              <Input
                id="inst-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Colegio San José"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-phone">Teléfono</Label>
              <Input
                id="inst-phone"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                placeholder="+52 55 1234 5678"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="inst-email">Correo electrónico institucional</Label>
              <Input
                id="inst-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value || null })}
                placeholder="contacto@colegio.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-website">Sitio web</Label>
              <Input
                id="inst-website"
                type="url"
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value || null })}
                placeholder="https://www.colegio.edu"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inst-address">Dirección</Label>
              <Input
                id="inst-address"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value || null })}
                placeholder="Av. Principal 123, Ciudad"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
