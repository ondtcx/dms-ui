"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { academicYearsService } from "@/lib/services/academic-years.service";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Store global para el año lectivo activo en el contexto de la sesión.
// La selección persistida registra su propietario y se restablece al cambiar de usuario.
export const useAcademicYearStore = create<{
  currentYearId: number | null;
  persistedUserId: string | null;
  hasInitializedYear: boolean;
  setCurrentYearId: (id: number | null) => void;
  resetForUser: (userId: string) => void;
}>()(
  persist(
    (set) => ({
      currentYearId: null,
      persistedUserId: null,
      hasInitializedYear: false,
      setCurrentYearId: (id) => set({ currentYearId: id, hasInitializedYear: true }),
      resetForUser: (userId) =>
        set({ currentYearId: null, persistedUserId: userId, hasInitializedYear: false }),
    }),
    {
      name: "academic-year-storage",
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as { currentYearId: number | null; persistedUserId: string | null };
        return { ...state, hasInitializedYear: typeof state.currentYearId === "number" };
      },
    },
  ),
);

export function AcademicYearSelector({ label = "Filtrar por año lectivo" }: { label?: string } = {}) {
  const { user } = useAuth();
  const { data: years, isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsService.getAll(),
  });

  const { currentYearId, persistedUserId, hasInitializedYear, setCurrentYearId, resetForUser } =
    useAcademicYearStore();

  // Inicializar solo para el usuario autenticado, sin reemplazar una elección explícita.
  useEffect(() => {
    if (!user?.id) return;
    if (persistedUserId !== user.id) {
      resetForUser(user.id);
      return;
    }
    if (hasInitializedYear || !years?.data) return;
    const initialYear = years.data.find((year) => year.isCurrent && year.isActive)
      ?? years.data.find((year) => year.isActive);
    if (initialYear) {
      setCurrentYearId(initialYear.id);
    }
  }, [user?.id, persistedUserId, hasInitializedYear, years, resetForUser, setCurrentYearId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        Cargando...
      </div>
    );
  }

  if (!years || years.data.length === 0) {
    return null;
  }

  const selectValue = currentYearId === null ? "all" : currentYearId.toString();

  return (
    <Select
      value={selectValue}
      onValueChange={(val) =>
        setCurrentYearId(val === "all" ? null : Number(val))
      }
    >
      <SelectTrigger className="w-full h-9" aria-label={label}>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0" />
          <SelectValue placeholder="Selecciona año" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los años</SelectItem>
        {years.data
          .filter((year) => year.isActive)
          .map((year) => (
            <SelectItem key={year.id} value={year.id.toString()}>
              {year.name}
              {year.isCurrent && (
                <span className="text-xs text-primary ml-1">(Actual)</span>
              )}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
