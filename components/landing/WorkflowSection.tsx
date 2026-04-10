import { FileText, Eye, CheckCircle2, Archive } from "lucide-react";

const steps = [
  {
    icon: FileText,
    color: "bg-blue-100 border-blue-300 text-blue-700",
    title: "El docente crea el documento",
    description:
      "Selecciona la plantilla correspondiente, completa los datos requeridos y envía el documento al flujo de aprobación.",
  },
  {
    icon: Eye,
    color: "bg-indigo-100 border-indigo-300 text-indigo-700",
    title: "El coordinador revisa",
    description:
      "Recibe una notificación automática, lee el documento y decide aprobarlo o solicitar correcciones con comentarios.",
  },
  {
    icon: CheckCircle2,
    color: "bg-emerald-100 border-emerald-300 text-emerald-700",
    title: "El rector aprueba",
    description:
      "Da el visto bueno final. El documento queda aprobado y registrado oficialmente en el sistema con sello de aprobación.",
  },
  {
    icon: Archive,
    color: "bg-slate-100 border-slate-300 text-slate-700",
    title: "El sistema archiva y audita",
    description:
      "El documento queda indexado, versionado y disponible para consulta futura con pista de auditoría completa.",
  },
];

export default function WorkflowSection() {
  return (
    <section id="flujos" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Texto izquierdo */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 mb-3">
              Flujos de trabajo
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              De la creación a la aprobación, todo trazado
            </h2>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              Configure circuitos de aprobación a medida de su institución.
              Defina quién crea, quién revisa y quién aprueba cada tipo de
              documento.
            </p>
            <p className="mt-3 text-lg text-slate-600 leading-relaxed">
              Sin papeles en escritorios, sin emails perdidos. Cada acción queda
              registrada con fecha, hora y responsable.
            </p>

            {/* Callout */}
            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium">
                💡 Los flujos son completamente configurables. Puede definir 1
                paso o 5, con los roles que su institución requiera.
              </p>
            </div>
          </div>

          {/* Diagrama vertical */}
          <div className="relative">
            <div className="space-y-0">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === steps.length - 1;
                return (
                  <div key={step.title} className="relative flex gap-5">
                    {/* Línea conectora + círculo */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`relative z-10 w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${step.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-full bg-slate-200 my-1" />
                      )}
                    </div>

                    {/* Contenido del paso */}
                    <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
                      <h3 className="text-base font-semibold text-slate-900 leading-tight pt-2">
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
