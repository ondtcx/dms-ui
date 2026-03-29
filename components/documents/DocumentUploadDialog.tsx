import { Dispatch, SetStateAction } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AcademicYear, Category, Section, UploadDocumentDto } from "@/lib/types";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadData: UploadDocumentDto;
  onUploadDataChange: Dispatch<SetStateAction<UploadDocumentDto>>;
  selectedFile: File | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  categories: Category[] | undefined;
  academicYears?: AcademicYear[];
  loadingCategories: boolean;
  loadingSections: boolean;
  uploading: boolean;
  onUpload: () => void;
  formatFileSize: (size: number) => string;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  uploadData,
  onUploadDataChange,
  selectedFile,
  onFileChange,
  categories,
  academicYears,
  loadingCategories,
  loadingSections,
  uploading,
  onUpload,
  formatFileSize,
}: DocumentUploadDialogProps) {
  const updateUploadData = (updates: Partial<UploadDocumentDto>) => {
    onUploadDataChange({ ...uploadData, ...updates });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Subir Documento</DialogTitle>
          <DialogDescription>
            Completa la información del documento que deseas subir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleccionar archivo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Archivo *</label>
            <Input
              type="file"
              onChange={onFileChange}
              className="cursor-pointer"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Archivo seleccionado: {selectedFile.name} (
                {formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          <Separator />

          {/* Categoría */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select
              value={uploadData.categoryId?.toString() || ""}
              onValueChange={(value) =>
                updateUploadData({
                  categoryId: value ? parseInt(value) : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {!loadingCategories &&
                  categories
                    ?.filter((cat) => cat.isActive)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          {/* Año Lectivo */}
          {academicYears && academicYears.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Año Lectivo</label>
              <Select
                value={uploadData.academicYearId?.toString() || "auto"}
                onValueChange={(value) =>
                  updateUploadData({
                    academicYearId: value === "auto" ? undefined : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Año activo (por defecto)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Año activo (por defecto)</SelectItem>
                  {academicYears
                    .filter((y) => y.isActive)
                    .map((year) => (
                      <SelectItem key={year.id} value={year.id.toString()}>
                        {year.name}
                        {year.isCurrent ? " (Actual)" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Para documentos de años anteriores, selecciona el año correspondiente.
              </p>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={uploadData.description || ""} // ✅ Ya está aquí
              onChange={(e) =>
                updateUploadData({ description: e.target.value })
              }
              placeholder="Describe el contenido del documento..."
              rows={3}
            />
          </div>

          {/* Visibilidad */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={uploadData.isPublic || false} // ✅ Ya está aquí
              onCheckedChange={(checked) =>
                updateUploadData({ isPublic: checked as boolean })
              }
            />
            <label
              htmlFor="isPublic"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Hacer público (visible para todos los usuarios)
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onUpload} disabled={uploading || !selectedFile}>
            {uploading ? "Subiendo..." : "Subir Documento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
