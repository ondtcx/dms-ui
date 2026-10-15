import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUploadMetadata } from "@/hooks/use-upload-metadata";
import { documentTypesService } from "@/lib/services/document-types.service";
import { categoriesService } from "@/lib/services/categories.service";
import { academicYearsService } from "@/lib/services/academic-years.service";

jest.mock("@/lib/services/categories.service", () => ({
  categoriesService: { getActive: jest.fn() },
}));
jest.mock("@/lib/services/academic-years.service", () => ({
  academicYearsService: { getAll: jest.fn() },
}));
jest.mock("@/lib/services/document-types.service", () => ({
  documentTypesService: { getActive: jest.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useUploadMetadata", () => {
  it("derives the persisted default type from the active document types", async () => {
    jest.mocked(categoriesService.getActive).mockResolvedValue([]);
    jest
      .mocked(academicYearsService.getAll)
      .mockResolvedValue({ data: [] } as never);
    jest.mocked(documentTypesService.getActive).mockResolvedValue([
      { id: 12, name: "Oficio" },
      { id: 22, name: "Documento general", isDefault: true },
    ] as never);

    const { result } = renderHook(() => useUploadMetadata(), { wrapper });

    await waitFor(() =>
      expect(result.current.uploadDocumentTypes).toEqual([
        { id: 12, name: "Oficio" },
        { id: 22, name: "Documento general", isDefault: true },
      ]),
    );
    expect(result.current.defaultDocumentType).toMatchObject({
      id: 22,
      name: "Documento general",
      isDefault: true,
    });
  });
});
