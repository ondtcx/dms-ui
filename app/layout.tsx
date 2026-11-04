import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 👉 Providers globales
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { SettingsProvider } from "@/lib/contexts/SettingsContext";
import { ReactQueryProvider } from "@/lib/react-query";
import { Toaster } from "react-hot-toast";

// 👉 Fuentes Google optimizadas por Next.js
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 👉 Metadatos globales del sitio
export const metadata: Metadata = {
  title: "EduDocs – Gestión Documental",
  description:
    "Sistema de gestión documental para la Unidad Educativa Vicente Fierro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* React Query Provider */}
        <ReactQueryProvider>
          {/* Contexto de Autenticación */}
          <AuthProvider>
            {/* Configuración del sistema */}
            <SettingsProvider>
              {children}
            </SettingsProvider>
            {/* Notificaciones globales */}
            <Toaster position="top-right" />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
