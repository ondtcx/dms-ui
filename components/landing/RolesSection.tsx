import { Building2, Users, BookOpen, ClipboardList, UserCheck } from "lucide-react";

const roles = [
  {
    icon: Building2,
    accent: "border-blue-500 bg-blue-50",
    iconColor: "text-blue-700",
    title: "Director/a",
    description:
      "Visibilidad total sobre la institución. Aprueba documentos, gestiona equipos y accede a reportes de toda la organización.",
  },
  {
    icon: Users,
    accent: "border-indigo-500 bg-indigo-50",
    iconColor: "text-indigo-700",
    title: "Coordinador/a",
    description:
      "Supervisa los documentos de su nivel académico. Revisa planificaciones docentes y emite constancias de su área.",
  },
  {
    icon: BookOpen,
    accent: "border-emerald-500 bg-emerald-50",
    iconColor: "text-emerald-700",
    title: "Docente",
    description:
      "Crea y sube sus documentos de cátedra. Recibe notificaciones de aprobación y comparte material con sus cursos.",
  },
  {
    icon: ClipboardList,
    accent: "border-amber-500 bg-amber-50",
    iconColor: "text-amber-700",
    title: "Secretaría",
    description:
      "Gestiona constancias, actas y legajos. Acceso completo a todas las categorías administrativas de la institución.",
  },
  {
    icon: UserCheck,
    accent: "border-rose-500 bg-rose-50",
    iconColor: "text-rose-700",
    title: "Familia / Alumno",
    description:
      "Accede únicamente a los documentos que le fueron compartidos. Vista simplificada, sin complejidad administrativa.",
  },
];

export default function RolesSection() {
  return (
    <section id="para-quien" className="py-20 md:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-3">
            Para quién
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Un sistema que entiende la estructura de su institución
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Diferentes roles, diferentes necesidades. EduDocs se adapta a cada
            actor de la comunidad educativa.
          </p>
        </div>

        {/* Cards de roles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.title}
                className={`rounded-2xl border-t-4 bg-white p-6 shadow-sm hover:shadow-md transition-shadow ${role.accent}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${role.accent}`}>
                  <Icon className={`w-5 h-5 ${role.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mt-4">
                  {role.title}
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {role.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
