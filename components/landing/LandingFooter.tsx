import { FileText } from "lucide-react";
import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer>
      {/* Zona CTA */}
      <div className="bg-blue-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            ¿Listo para ordenar la gestión documental de su colegio?
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            Solicite una demostración y vea el sistema funcionando con los datos
            reales de su institución.
          </p>
          <Link
            href="/auth/login"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-white text-blue-700 font-semibold text-base px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg"
          >
            Iniciar sesión / Solicitar demo
          </Link>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo y descripción */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-700 rounded-md flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-base">EduDocs</span>
                <p className="text-slate-500 text-xs">
                  Sistema de Gestión Documental para instituciones educativas
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/auth/login"
                className="text-slate-400 hover:text-white transition-colors"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-sm">
              © 2026 EduDocs. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
