"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { academicYearsService } from "@/lib/services/academic-years.service";
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

// Global store for active academic year
export const useAcademicYearStore = create<{
  currentYearId: number | null;
  setCurrentYearId: (id: number | null) => void;
}>()(
  persist(
    (set) => ({
      currentYearId: null,
      setCurrentYearId: (id) => set({ currentYearId: id }),
    }),
    {
      name: "academic-year-storage",
    }
  )
);

export function AcademicYearSelector() {
  const { data: years, isLoading } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsService.getAll(),
  });

  const { currentYearId, setCurrentYearId } = useAcademicYearStore();

  // Auto-select current year on load
  useEffect(() => {
    if (years?.data && !currentYearId) {
      const current = years.data.find((y) => y.isCurrent);
      if (current) {
        setCurrentYearId(current.id);
      } else if (years.data.length > 0) {
        // If no year marked as current, select first active year
        const firstActive = years.data.find((y) => y.isActive);
        if (firstActive) {
          setCurrentYearId(firstActive.id);
        }
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

  return (
    <Select
      value={currentYearId?.toString() || ""}
      onValueChange={(val) => setCurrentYearId(val ? Number(val) : null)}
    >
      <SelectTrigger className="w-[200px] h-9">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <SelectValue placeholder="Selecciona año" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {years.data
          .filter((year) => year.isActive)
          .map((year) => (
            <SelectItem key={year.id} value={year.id.toString()}>
              <div className="flex items-center gap-2">
                {year.name}
                {year.isCurrent && (
                  <span className="text-xs text-primary">(Actual)</span>
                )}
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
