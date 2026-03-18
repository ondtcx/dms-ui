import { FileText } from "lucide-react";
import Link from "next/link";

export default function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">EduDocs</span>
          </div>

          {/* Links de navegación */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#funcionalidades"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#para-quien"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Para quién
            </a>
            <a
              href="#flujos"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Flujos de trabajo
            </a>
          </div>

          {/* CTA */}
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-2 hover:bg-blue-800 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </nav>
  );
}
