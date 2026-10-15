"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService, SystemSettings } from "@/lib/services/settings.service";

type SettingsResponse = Omit<SystemSettings, "documents" | "notifications" | "security"> &
  Partial<Pick<SystemSettings, "documents" | "notifications" | "security">>;
import { useAuth } from "@/lib/contexts/AuthContext";
import type { AppearanceSettings } from "@/lib/services/settings.service";

interface SettingsContextType {
  settings: SettingsResponse | null;
  isLoading: boolean;
  refresh: () => void;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  primaryColor: "#1e3a5f",
  secondaryColor: "#047857",
  theme: "system",
};

export function resolveAppearanceColors(
  appearance?: Partial<AppearanceSettings> | null,
): AppearanceSettings {
  return {
    primaryColor:
      normalizeHexColor(appearance?.primaryColor) ?? DEFAULT_APPEARANCE.primaryColor,
    secondaryColor:
      normalizeHexColor(appearance?.secondaryColor) ?? DEFAULT_APPEARANCE.secondaryColor,
    theme:
      appearance?.theme === "light" ||
      appearance?.theme === "dark" ||
      appearance?.theme === "system"
        ? appearance.theme
        : DEFAULT_APPEARANCE.theme,
  };
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ── Conversión hex → oklch ────────────────────────────────────────────────────
// Necesaria porque TailwindCSS v4 define sus variables CSS en formato oklch(L C H)
function hexToOklch(hex: string): string {
  try {
    // Normalizar hex de 3 dígitos a 6
    if (hex.length === 4) {
      hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;

    // 1. Hex → sRGB lineal
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const lin = (c: number) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const [lr, lg, lb] = [lin(r), lin(g), lin(b)];

    // 2. sRGB lineal → OKLab (matriz de Björn Ottosson)
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bv = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

    // 3. OKLab → OKLCh
    const C = Math.sqrt(a * a + bv * bv);
    const H = (Math.atan2(bv, a) * 180) / Math.PI;
    const hue = H < 0 ? H + 360 : H;

    return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${hue.toFixed(3)})`;
  } catch {
    return hex; // fallback: devuelve el hex original sin romper
  }
}

const LIGHT_FOREGROUND = "oklch(0.985 0 0)";
const DARK_FOREGROUND = "oklch(0.145 0 0)";

export function normalizeHexColor(hex: unknown): string | null {
  if (typeof hex !== "string") return null;

  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;

  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : null;
}

export function resolveColorForeground(hex: string): string {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return LIGHT_FOREGROUND;

  const channels = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset + 1, offset + 3), 16) / 255);
  const linearChannels = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4),
  );
  const luminance = 0.2126 * linearChannels[0] + 0.7152 * linearChannels[1] + 0.0722 * linearChannels[2];
  const lightContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;

  return lightContrast >= darkContrast ? LIGHT_FOREGROUND : DARK_FOREGROUND;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data: settings = null, isLoading } = useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: settingsService.get,
    enabled: !authLoading && isAuthenticated,
    staleTime: Infinity,
    retry: false,
  });

  // Aplicar colores al DOM cuando cargue la configuración
  useEffect(() => {
    if (!settings) return;
    const { primaryColor, secondaryColor } = resolveAppearanceColors(settings.appearance);

    const primaryOklch = hexToOklch(primaryColor);
    const secondaryOklch = hexToOklch(secondaryColor);
    const primaryForeground = resolveColorForeground(primaryColor);
    const secondaryForeground = resolveColorForeground(secondaryColor);

    // Variables que Tailwind v4 + shadcn/ui realmente leen en runtime
    document.documentElement.style.setProperty("--primary", primaryOklch);
    document.documentElement.style.setProperty("--primary-foreground", primaryForeground);
    document.documentElement.style.setProperty("--ring", primaryOklch);
    document.documentElement.style.setProperty("--sidebar-primary", primaryOklch);
    document.documentElement.style.setProperty("--sidebar-primary-foreground", primaryForeground);
    document.documentElement.style.setProperty("--accent", secondaryOklch);
    document.documentElement.style.setProperty("--accent-foreground", secondaryForeground);
    document.documentElement.style.setProperty("--secondary", secondaryOklch);
    document.documentElement.style.setProperty("--secondary-foreground", secondaryForeground);
    document.documentElement.style.setProperty("--institution-primary", primaryOklch);
    document.documentElement.style.setProperty("--institution-primary-foreground", primaryForeground);
    document.documentElement.style.setProperty("--institution-secondary", secondaryOklch);
    document.documentElement.style.setProperty("--institution-secondary-foreground", secondaryForeground);

    // También conservar los valores hex originales para uso directo en CSS
    document.documentElement.style.setProperty("--settings-primary", primaryColor);
    document.documentElement.style.setProperty("--settings-secondary", secondaryColor);
  }, [settings]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings debe usarse dentro de <SettingsProvider>");
  return ctx;
}
