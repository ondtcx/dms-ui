import api from "@/lib/axios";
import { transfersService } from "../transfers.service";

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
};

describe("transfersService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates owner and admin transfer requests on their endpoints", async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 1 } });
    const payload = { documentId: 4, toUserId: "recipient", comment: "Replacement" };

    await transfersService.create(payload);
    expect(mockedApi.post).toHaveBeenCalledWith("/transfers", payload);

    await transfersService.createForOwner(payload);
    expect(mockedApi.post).toHaveBeenLastCalledWith("/transfers/admin", payload);
  });

  it("reads sent, received, and stats", async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await transfersService.getSent();
    expect(mockedApi.get).toHaveBeenCalledWith("/transfers/sent");

    await transfersService.getReceived();
    expect(mockedApi.get).toHaveBeenLastCalledWith("/transfers/received");

    await transfersService.getStats();
    expect(mockedApi.get).toHaveBeenLastCalledWith("/transfers/stats");
  });

  it("accepts and cancels with the transfer id", async () => {
    mockedApi.patch.mockResolvedValue({ data: { id: 9 } });

    await transfersService.accept(9);
    expect(mockedApi.patch).toHaveBeenCalledWith("/transfers/9/accept");

    await transfersService.cancel(9);
    expect(mockedApi.patch).toHaveBeenLastCalledWith("/transfers/9/cancel");
  });
});
