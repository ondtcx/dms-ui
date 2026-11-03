/** @jest-environment node */
const mockToastError = jest.fn();

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: mockToastError, success: jest.fn() },
}));
jest.mock("js-cookie", () => ({
  __esModule: true,
  default: { get: jest.fn(), remove: jest.fn() },
}));

describe("axios response interceptor", () => {
  afterEach(() => {
    mockToastError.mockReset();
    delete (globalThis as any).window;
  });

  it("redirects TWO_FACTOR_SETUP_REQUIRED responses to the account page", async () => {
    (globalThis as any).window = {
      location: { pathname: "/dashboard/home", href: "/dashboard/home" },
    };
    const api = require("@/lib/axios").default;
    const rejected = (api.interceptors.response as any).handlers[0].rejected;
    const error = {
      response: {
        status: 403,
        data: { code: "TWO_FACTOR_SETUP_REQUIRED" },
      },
      config: {},
    };

    await expect(rejected(error)).rejects.toBe(error);
    expect((globalThis as any).window.location.href).toBe(
      "/dashboard/mi-cuenta",
    );
    expect(mockToastError).toHaveBeenCalledTimes(1);
  });

  it("does not redirect again when already on the account page", async () => {
    (globalThis as any).window = {
      location: {
        pathname: "/dashboard/mi-cuenta",
        href: "/dashboard/mi-cuenta",
      },
    };
    const api = require("@/lib/axios").default;
    const rejected = (api.interceptors.response as any).handlers[0].rejected;
    const error = {
      response: {
        status: 403,
        data: { code: "TWO_FACTOR_SETUP_REQUIRED" },
      },
      config: {},
    };

    await expect(rejected(error)).rejects.toBe(error);
    expect((globalThis as any).window.location.href).toBe(
      "/dashboard/mi-cuenta",
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
