import { Shield, GitBranch, FileCheck2 } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-slate-900 to-blue-900 py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center rounded-full bg-blue-800/50 border border-blue-700/50 px-4 py-1.5 mb-8">
          <span className="text-sm font-medium text-blue-200">
            Sistema de Gestión Documental
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight max-w-4xl mx-auto leading-tight">
          La gestión documental que su institución educativa necesita
        </h1>

        {/* Subtítulo */}
        <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Centralice, organice y controle todos los documentos de su colegio.
          Desde actas y constancias hasta planificaciones curriculares, con
          flujos de aprobación configurables y acceso por roles.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-lg bg-white text-blue-700 font-semibold text-base px-8 py-3.5 hover:bg-blue-50 transition-colors shadow-lg"
          >
            Solicitar demostración
          </Link>
          <a
            href="#funcionalidades"
            className="inline-flex items-center justify-center rounded-lg border border-white/30 text-white font-semibold text-base px-8 py-3.5 hover:bg-white/10 transition-colors"
          >
            Ver funcionalidades ↓
          </a>
        </div>

        {/* Social proof strip */}
        <div className="mt-16 pt-10 border-t border-white/10">
          <p className="text-sm text-slate-400 mb-6">
            Diseñado para directivos, coordinadores, docentes y secretaría
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-slate-300">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Acceso por roles</span>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Flujos configurables</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">Auditoría completa</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
