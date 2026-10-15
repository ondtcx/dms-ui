import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";
import type { ReceptionSettings } from "@/lib/types";

jest.mock("@/lib/axios", () => ({
  get: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
}));

function settings(overrides: Partial<ReceptionSettings> = {}): ReceptionSettings {
  return {
    directoryId: 5,
    enabled: true,
    singleDocumentPerParticipant: false,
    capabilities: {
      configure: true,
      manageParticipants: true,
      readAll: true,
      review: true,
      manageDelegates: true,
      manageStructure: true,
      owner: true,
      discover: true,
      submit: true,
      peerRead: false,
    },
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe("documentsService reception settings", () => {
  it("reads the capability readback from the directory reception endpoint", async () => {
    const readback = settings();
    jest.mocked(api.get).mockResolvedValueOnce({ data: readback });

    await expect(documentsService.getReception(5)).resolves.toEqual(readback);
    expect(api.get).toHaveBeenCalledWith("/directories/5/reception");
  });

  it("sends only enabled and the quota flag when configuring", async () => {
    jest.mocked(api.patch).mockResolvedValueOnce({ data: settings() });

    await documentsService.configureReception(5, {
      enabled: true,
      singleDocumentPerParticipant: true,
    });

    expect(api.patch).toHaveBeenCalledWith("/directories/5/reception", {
      enabled: true,
      singleDocumentPerParticipant: true,
    });
  });

  it("omits the quota field when it is not provided", async () => {
    jest.mocked(api.patch).mockResolvedValueOnce({ data: settings() });

    await documentsService.configureReception(5, { enabled: true });

    expect(api.patch).toHaveBeenCalledWith("/directories/5/reception", {
      enabled: true,
    });
  });
});
