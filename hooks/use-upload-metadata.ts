import { useQuery } from "@tanstack/react-query";
import { categoriesService } from "@/lib/services/categories.service";
import { academicYearsService } from "@/lib/services/academic-years.service";
import { documentTypesService } from "@/lib/services/document-types.service";
import { coursesService } from "@/lib/services/courses.service";
import type { AcademicYear, Category } from "@/lib/types";

interface UseUploadMetadataOptions {
  categoryId: number | undefined;
  courseId: number | undefined;
}

export function useUploadMetadata({ categoryId, courseId }: UseUploadMetadataOptions) {
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
  const showCourseFields = selectedCategory?.requiresCourse ?? false;

  const { data: allCourses, isLoading: loadingCourses } = useQuery({
    queryKey: ["courses-all"],
    queryFn: () => coursesService.getAll({ limit: 100 }).then((r) => r.data),
    enabled: showCourseFields,
  });

  const { data: courseSubjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ["course-subjects", courseId],
    queryFn: () => coursesService.getSubjects(courseId!),
    enabled: showCourseFields && !!courseId,
  });

  const academicYears: AcademicYear[] | undefined = academicYearsData?.data;

  return {
    categories,
    loadingCategories,
    academicYears,
    uploadDocumentTypes,
    allCourses,
    loadingCourses,
    courseSubjects,
    loadingSubjects,
    selectedCategory,
    showCourseFields,
  };
}
