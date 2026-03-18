const stats = [
  { value: "9", label: "roles de usuario configurables" },
  { value: "100%", label: "auditoría de accesos y cambios" },
  { value: "PDF", label: "generación automática desde plantillas" },
  { value: "∞", label: "versiones por documento" },
];

export default function StatsSection() {
  return (
    <section className="py-20 md:py-28 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Una solución pensada para la escuela
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            Todas las funcionalidades que los equipos de gestión necesitan, sin
            la complejidad de sistemas diseñados para empresas.
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
