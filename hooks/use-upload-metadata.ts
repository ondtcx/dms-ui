import { useQuery } from "@tanstack/react-query";
import { categoriesService } from "@/lib/services/categories.service";
import { academicYearsService } from "@/lib/services/academic-years.service";
import { documentTypesService } from "@/lib/services/document-types.service";
import type { AcademicYear, Category } from "@/lib/types";

interface UseUploadMetadataOptions {
  categoryId: number | undefined;
}

export function useUploadMetadata({ categoryId }: UseUploadMetadataOptions) {
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoriesService.getActive(),
  });

  const { data: academicYearsData } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => academicYearsService.getAll(),
  });

  const { data: uploadDocumentTypes } = useQuery({
    queryKey: ["document-types", "active", categoryId],
    queryFn: () => documentTypesService.getActive(categoryId),
    enabled: !!categoryId,
  });

  const selectedCategory: Category | undefined = categories?.find((c) => c.id === categoryId);

  const academicYears: AcademicYear[] | undefined = academicYearsData?.data;

  return {
    categories,
    loadingCategories,
    academicYears,
    uploadDocumentTypes,
    selectedCategory,
  };
}
