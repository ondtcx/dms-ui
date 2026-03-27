const stats = [
  { value: "20+", label: "plantillas institucionales listas para usar" },
  { value: "100%", label: "trazabilidad: quién hizo qué y cuándo" },
  { value: "0", label: "documentos perdidos con archivo digital centralizado" },
  { value: "7", label: "categorías documentales para toda la institución" },
];

export default function StatsSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Resultados concretos para su institución
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            No es un sistema genérico adaptado. EduDocs fue construido
            exclusivamente para la realidad de los colegios.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.value} className="text-center">
              <p className="text-5xl font-bold text-white">{stat.value}</p>
              <p className="text-slate-400 text-sm mt-2 leading-snug">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
