import type { Metadata } from "next";
import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import RolesSection from "@/components/landing/RolesSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import StatsSection from "@/components/landing/StatsSection";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "EduDocs – Gestión Documental para Instituciones Educativas",
  description:
    "Sistema de gestión documental para colegios. Centralice documentos, configure flujos de aprobación y controle el acceso por roles. Diseñado para directivos, coordinadores, docentes y secretaría.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <RolesSection />
      <WorkflowSection />
      <StatsSection />
      <LandingFooter />
    </main>
  );
}
