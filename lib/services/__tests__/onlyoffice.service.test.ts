import api from "@/lib/axios";
import { onlyofficeService } from "@/lib/services/onlyoffice.service";

jest.mock("@/lib/axios", () => ({
  get: jest.fn(),
}));

describe("onlyofficeService.checkHealth", () => {
  it("returns the availability reported by the API", async () => {
    jest.mocked(api.get).mockResolvedValueOnce({ data: { available: true } });

    await expect(onlyofficeService.checkHealth()).resolves.toBe(true);
    expect(api.get).toHaveBeenCalledWith("/onlyoffice/health");
  });

  it("returns false when the health request fails", async () => {
    jest.mocked(api.get).mockRejectedValueOnce(new Error("offline"));

    await expect(onlyofficeService.checkHealth()).resolves.toBe(false);
  });
});
