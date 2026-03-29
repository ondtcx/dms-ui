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
// La clave de persistencia incluye el userId para evitar que sesiones de
// distintos usuarios en el mismo navegador compartan la misma selección.
export const useAcademicYearStore = create<{
  currentYearId: number | null;
  persistedUserId: string | null;
  setCurrentYearId: (id: number | null) => void;
  resetForUser: (userId: string) => void;
}>()(
  persist(
    (set) => ({
      currentYearId: null,
      persistedUserId: null,
      setCurrentYearId: (id) => set({ currentYearId: id }),
      resetForUser: (userId) =>
        set({ currentYearId: null, persistedUserId: userId }),
    }),
    { name: "academic-year-storage" },
  ),
);

export function AcademicYearSelector() {
  const { user } = useAuth();
  const { data: years, isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsService.getAll(),
  });

  const { currentYearId, persistedUserId, setCurrentYearId, resetForUser } =
    useAcademicYearStore();

  // Reset del store cuando cambia el usuario (ej: otro usuario en el mismo navegador)
  useEffect(() => {
    if (user?.id && persistedUserId && persistedUserId !== user.id) {
      resetForUser(user.id);
    } else if (user?.id && !persistedUserId) {
      resetForUser(user.id);
    }
  }, [user?.id, persistedUserId, resetForUser]);

  // Auto-seleccionar el año isCurrent si no hay ninguno seleccionado
  useEffect(() => {
    if (years?.data && currentYearId === null) {
      const current = years.data.find((y) => y.isCurrent);
      if (current) {
        setCurrentYearId(current.id);
      } else {
        const firstActive = years.data.find((y) => y.isActive);
        if (firstActive) setCurrentYearId(firstActive.id);
      }
    }
  }, [years, currentYearId, setCurrentYearId]);

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
      <SelectTrigger className="w-full h-9">
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
