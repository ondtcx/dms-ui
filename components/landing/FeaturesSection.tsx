import {
  FileText,
  GitBranch,
  Shield,
  Clock,
  Search,
  Bell,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    color: "bg-blue-50 text-blue-700",
    title: "Creación desde plantillas",
    description:
      "Genere actas, constancias, informes y planificaciones a partir de plantillas institucionales. El sistema produce PDFs profesionales automáticamente, listos para firmar o archivar.",
  },
  {
    icon: GitBranch,
    color: "bg-indigo-50 text-indigo-700",
    title: "Flujos de aprobación",
    description:
      "Configure circuitos de revisión multi-paso: el docente crea, el coordinador revisa, el rector aprueba. Cada paso queda registrado con fecha, hora y responsable.",
  },
  {
    icon: Shield,
    color: "bg-emerald-50 text-emerald-700",
    title: "Acceso por roles",
    description:
      "Cada usuario ve solo lo que le corresponde. Director, coordinador, profesor, secretario, padre y estudiante tienen permisos diferenciados, configurables por categoría de documento.",
  },
  {
    icon: Clock,
    color: "bg-amber-50 text-amber-700",
    title: "Historial y versiones",
    description:
      "Cada modificación genera una nueva versión. Consulte quién editó cada documento, cuándo y qué cambió. Auditoría completa para inspecciones y acreditaciones.",
  },
  {
    icon: Search,
    color: "bg-teal-50 text-teal-700",
    title: "Búsqueda institucional",
    description:
      "Encuentre cualquier documento en segundos con búsqueda de texto completo. El sistema recuerda sus búsquedas frecuentes para acceso rápido.",
  },
  {
    icon: Bell,
    color: "bg-rose-50 text-rose-700",
    title: "Notificaciones y calendario",
    description:
      "Reciba alertas cuando un documento requiere su revisión o fue aprobado. Visualice vencimientos y reuniones en el calendario integrado.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-3">
            Funcionalidades
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Todo lo que su colegio necesita en un solo lugar
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Sin hojas de cálculo, sin carpetas desorganizadas. Un sistema
            pensado para la realidad de las instituciones educativas.
          </p>
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${feature.color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mt-4">
                  {feature.title}
                </h3>
                <p className="text-slate-600 mt-2 text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
