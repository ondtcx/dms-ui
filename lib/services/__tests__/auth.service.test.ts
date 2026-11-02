import Cookies from "js-cookie";
import api from "@/lib/axios";
import { authService } from "../auth.service";

jest.mock("js-cookie", () => ({
  __esModule: true,
  default: { get: jest.fn(), remove: jest.fn() },
}));
jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

const mockedCookies = Cookies as unknown as {
  get: jest.Mock;
  remove: jest.Mock;
};
const mockedApi = api as unknown as { post: jest.Mock };

describe("authService.logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears the local session and revokes the captured token on the server", async () => {
    mockedCookies.get.mockReturnValue("token");
    mockedApi.post.mockResolvedValue({});

    await authService.logout();

    expect(mockedCookies.remove).toHaveBeenCalledWith("token", { path: "/" });
    expect(mockedCookies.remove).toHaveBeenCalledWith("user", { path: "/" });
    expect(mockedApi.post).toHaveBeenCalledWith("/auth/logout", undefined, {
      headers: { Authorization: "Bearer token" },
      silentErrors: [401],
    });
  });

  it("keeps the user logged out when server revocation fails", async () => {
    mockedCookies.get.mockReturnValue("token");
    mockedApi.post.mockRejectedValue(new Error("network"));

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(mockedCookies.remove).toHaveBeenCalledTimes(2);
  });

  it("does not call the server when no token exists", async () => {
    mockedCookies.get.mockReturnValue(undefined);

    await authService.logout();

    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});
