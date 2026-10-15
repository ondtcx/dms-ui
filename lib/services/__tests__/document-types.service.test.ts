jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import api from "@/lib/axios";
import { documentTypesService } from "@/lib/services/document-types.service";

describe("documentTypesService generic contract", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not expose a concrete global default lookup", () => {
    expect("getDefault" in documentTypesService).toBe(false);
  });

  it("loads all and active subtypes from their catalog endpoints", async () => {
    jest.mocked(api.get).mockResolvedValue({ data: [] });

    await documentTypesService.getAll();
    expect(api.get).toHaveBeenCalledWith("/document-types", { params: undefined });

    await documentTypesService.getActive(7);
    expect(api.get).toHaveBeenCalledWith("/document-types/active", {
      params: { categoryId: 7 },
    });
  });
});
