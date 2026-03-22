export const UI_COLORS = [
  { value: "#10b981", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#f59e0b", label: "Naranja" },
  { value: "#8b5cf6", label: "Violeta" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#14b8a6", label: "Turquesa" },
  { value: "#f97316", label: "Naranja Intenso" },
  { value: "#6366f1", label: "Índigo" },
];

export const SECTION_ICONS = [
  { value: "FolderOpen",    label: "Carpeta Abierta" },
  { value: "BookOpen",      label: "Libro Abierto" },
  { value: "Building2",     label: "Edificio" },
  { value: "GraduationCap", label: "Birrete" },
  { value: "Users",         label: "Usuarios" },
  { value: "FileText",      label: "Documento" },
  { value: "ClipboardList", label: "Lista" },
  { value: "Calendar",      label: "Calendario" },
];

export const CATEGORY_ICONS = [
  { value: "Folder",        label: "Carpeta" },
  { value: "FileText",      label: "Documento" },
  { value: "Scale",         label: "Legal" },
  { value: "DollarSign",    label: "Finanzas" },
  { value: "GraduationCap", label: "Académico" },
  { value: "Users",         label: "Usuarios" },
  { value: "BookOpen",      label: "Libro" },
  { value: "ClipboardList", label: "Lista" },
];

// Roles válidos para restricción de categorías (excluye admin y user legacy)
export const CATEGORY_ROLES = [
  { value: "director",    label: "Director" },
  { value: "coordinador", label: "Coordinador" },
  { value: "profesor",    label: "Profesor" },
  { value: "secretario",  label: "Secretario" },
  { value: "padre",       label: "Padre/Madre" },
  { value: "estudiante",  label: "Estudiante" },
  { value: "moderador",   label: "Moderador" },
];
