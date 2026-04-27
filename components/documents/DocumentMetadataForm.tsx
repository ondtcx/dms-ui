"use client";

import { FolderOpen, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AcademicYear, Category, UploadMetadata } from "@/lib/types";

interface Course {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

interface DocumentType {
  id: number;
  name: string;
}

interface DocumentMetadataFormProps {
  value: UploadMetadata;
  onChange: (value: UploadMetadata) => void;

  categories: Category[] | undefined;
  loadingCategories: boolean;
  selectedCategory: Category | undefined;
  showCourseFields: boolean;

  academicYears: AcademicYear[] | undefined;
  showAcademicYear?: boolean;

  uploadDocumentTypes: DocumentType[] | undefined;
  showDocumentType?: boolean;

  allCourses: Course[] | undefined;
  loadingCourses: boolean;

  courseSubjects: Subject[] | undefined;
  loadingSubjects: boolean;

  userRole: string | undefined;

  descriptionLabel?: string;
  visibilityLabel?: string;
  isPublicCheckboxId?: string;
}

export function DocumentMetadataForm({
  value,
  onChange,
  categories,
  loadingCategories,
  selectedCategory,
  showCourseFields,
  academicYears,
  showAcademicYear = true,
  uploadDocumentTypes,
  showDocumentType = true,
  allCourses,
  loadingCourses,
  courseSubjects,
  loadingSubjects,
  userRole,
  descriptionLabel = "Descripción",
  visibilityLabel = "Hacer público (visible para todos los usuarios)",
  isPublicCheckboxId = "isPublic",
}: DocumentMetadataFormProps) {
  const updateValue = (updates: Partial<UploadMetadata>) =>
    onChange({ ...value, ...updates });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Título del documento *</label>
          <Input
            value={value.title}
            onChange={(e) => updateValue({ title: e.target.value })}
            placeholder="Ej. Solicitud de permiso docente"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Fecha del documento *</label>
          <Input
            type="date"
            value={value.documentDate}
            onChange={(e) => updateValue({ documentDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Estado *</label>
          <Select
            value={value.status}
            onValueChange={(status) =>
              updateValue({ status: status as UploadMetadata["status"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REGISTRADO">Registrado</SelectItem>
              <SelectItem value="EN_REVISION">En revisión</SelectItem>
              <SelectItem value="ARCHIVADO">Archivado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Remitente *</label>
          <Input
            value={value.sender}
            onChange={(e) => updateValue({ sender: e.target.value })}
            placeholder="Ej. Secretaría General"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Destinatario</label>
          <Input
            value={value.recipient}
            onChange={(e) => updateValue({ recipient: e.target.value })}
            placeholder="Ej. Rectorado"
          />
        </div>
      </div>

      <Separator />

      {/* Categoría */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Categoría</label>
        <Select
          value={value.categoryId?.toString() || ""}
          onValueChange={(v) =>
            updateValue({
              categoryId: v ? parseInt(v) : undefined,
              courseId: undefined,
              subjectId: undefined,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {!loadingCategories &&
              categories
                ?.filter((cat) => {
                  if (!cat.isActive) return false;
                  if (userRole === "admin") return true;
                  if (!cat.roles || cat.roles.length === 0) return true;
                  return userRole && cat.roles.some((r) => r.role.name === userRole);
                })
                .map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>

        {selectedCategory && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-1.5">
            {selectedCategory.description && (
              <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {selectedCategory.section && (
                <span
                  className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: selectedCategory.section.color,
                    color: selectedCategory.section.color,
                    backgroundColor: `${selectedCategory.section.color}15`,
                  }}
                >
                  {selectedCategory.section.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                Se archivará en:{" "}
                <span className="font-medium text-foreground">
                  {selectedCategory.section?.name ?? "Sin sección"}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Curso y Materia (condicional) */}
      {showCourseFields && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">Curso *</label>
            <Select
              value={value.courseId?.toString() || ""}
              onValueChange={(v) =>
                updateValue({
                  courseId: v ? parseInt(v) : undefined,
                  subjectId: undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un curso" />
              </SelectTrigger>
              <SelectContent>
                {!loadingCourses &&
                  allCourses?.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {value.courseId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Materia</label>
                <Select
                  value={value.subjectId?.toString() || ""}
                  onValueChange={(v) =>
                    updateValue({ subjectId: v ? parseInt(v) : undefined })
                  }
                >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una materia" />
                </SelectTrigger>
                <SelectContent>
                  {!loadingSubjects &&
                    courseSubjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {/* Año Lectivo */}
      {showAcademicYear && academicYears && academicYears.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Año Lectivo</label>
          <Select
            value={value.academicYearId?.toString() || "auto"}
            onValueChange={(v) =>
              updateValue({
                academicYearId: v === "auto" ? undefined : parseInt(v),
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

      {/* Subtipo de documento */}
      {showDocumentType && value.categoryId && uploadDocumentTypes && uploadDocumentTypes.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Subtipo de documento</label>
          <Select
            value={value.documentTypeId?.toString() ?? "none"}
            onValueChange={(v) =>
              updateValue({
                documentTypeId: v === "none" ? undefined : parseInt(v),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sin subtipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin subtipo</SelectItem>
              {uploadDocumentTypes.map((dt) => (
                <SelectItem key={dt.id} value={dt.id.toString()}>
                  {dt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Descripción */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">{descriptionLabel}</label>
          <Textarea
            value={value.description}
            onChange={(e) => updateValue({ description: e.target.value })}
            placeholder="Resume el contenido o asunto principal del documento..."
            rows={3}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Palabras clave</label>
          <Input
            value={value.keywords}
            onChange={(e) => updateValue({ keywords: e.target.value })}
            placeholder="Ej. permiso, docente, abril"
          />
          <p className="text-xs text-muted-foreground">
            Puedes separarlas por comas para facilitar la búsqueda.
          </p>
        </div>
      </div>

      <Separator />

      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Ubicación física</p>
            <p className="text-xs text-muted-foreground">
              Registra dónde se encuentra el documento en archivo físico.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Edificio *</label>
            <Input
              value={value.physicalBuilding}
              onChange={(e) => updateValue({ physicalBuilding: e.target.value })}
              placeholder="Ej. Edificio principal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Oficina *</label>
            <Input
              value={value.physicalOffice}
              onChange={(e) => updateValue({ physicalOffice: e.target.value })}
              placeholder="Ej. Secretaría"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Archivo o estante *</label>
            <Input
              value={value.physicalArchive}
              onChange={(e) => updateValue({ physicalArchive: e.target.value })}
              placeholder="Ej. Archivo A"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Gaveta o caja *</label>
            <Input
              value={value.physicalBox}
              onChange={(e) => updateValue({ physicalBox: e.target.value })}
              placeholder="Ej. Gaveta 2"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Observación de ubicación</label>
            <Textarea
              value={value.physicalNotes}
              onChange={(e) => updateValue({ physicalNotes: e.target.value })}
              placeholder="Ej. Carpeta azul con separador rojo"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Visibilidad */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id={isPublicCheckboxId}
          checked={value.isPublic}
          onCheckedChange={(checked) =>
            updateValue({ isPublic: checked as boolean })
          }
        />
        <label
          htmlFor={isPublicCheckboxId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {visibilityLabel}
        </label>
      </div>
    </>
  );
}
