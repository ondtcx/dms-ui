import { X, Check } from "lucide-react";

const before = [
  "El docente imprime la planificación y la entrega en mano a coordinación",
  "El coordinador la guarda en una carpeta y espera firmarse cuando pueda",
  "Si hay correcciones, la versión antigua ya circuló y no se sabe cuál es la vigente",
  "Para buscar un acta de reunión del año pasado, hay que revisar archivos físicos",
  "Nadie sabe con certeza si un trámite fue aprobado o sigue pendiente",
  "Si alguien falta, el proceso se detiene días hasta que regresa",
];

const after = [
  "El docente crea el documento desde una plantilla institucional en 5 minutos",
  "El coordinador recibe una notificación automática y aprueba desde cualquier dispositivo",
  "Cada versión queda registrada; la vigente siempre es la última del sistema",
  "Cualquier documento se encuentra en segundos con búsqueda de texto completo",
  "El rector ve en tiempo real qué está aprobado, en revisión o pendiente",
  "El proceso continúa aunque alguien no esté: el flujo no depende de una persona",
];

export default function ProblemSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-600 mb-3">
            El problema real
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            ¿Cuánto tiempo pierde su institución en papeles?
          </h2>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            La gestión documental en papel o por email genera demoras, errores y
            falta de trazabilidad. EduDocs fue diseñado específicamente para
            resolver esto.
          </p>
        </div>

        {/* Comparación antes / después */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ANTES */}
          <div className="bg-white border-2 border-rose-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <X className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                  Sin EduDocs
                </p>
                <h3 className="text-lg font-bold text-slate-900">El proceso hoy</h3>
              </div>
            </div>
            <ul className="space-y-4">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-rose-500" />
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-3 bg-rose-50 rounded-lg border border-rose-100">
              <p className="text-xs text-rose-700 font-medium">
                Resultado: días de demora, documentos extraviados, sin evidencia de quién hizo qué.
              </p>
            </div>
          </div>

          {/* DESPUÉS */}
          <div className="bg-white border-2 border-emerald-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Con EduDocs
                </p>
                <h3 className="text-lg font-bold text-slate-900">El proceso mejorado</h3>
              </div>
            </div>
            <ul className="space-y-4">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs text-emerald-700 font-medium">
                Resultado: aprobaciones en minutos, documentos siempre disponibles, auditoría completa.
              </p>
            </div>
          </div>
        </div>

        {/* Cifra destacada */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white border border-slate-200 rounded-2xl px-10 py-6 shadow-sm">
            <p className="text-5xl font-bold text-blue-700">3 días → 20 min</p>
            <p className="text-slate-500 text-base mt-2">
              Tiempo promedio de aprobación de un documento institucional
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
