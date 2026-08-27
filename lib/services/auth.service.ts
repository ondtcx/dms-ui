import api from "@/lib/axios";
import { AuthResponse, AuthorizationProfile, ChangePasswordDto, LoginDto, RegisterDto, User } from "@/lib/types";
import Cookies from "js-cookie";

export const authService = {
  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", data);

    // Guardar token y usuario en cookies
    Cookies.set("token", response.data.access_token, {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });
    Cookies.set("user", JSON.stringify(response.data.user), {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });

    return response.data;
  },

  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);

    // Guardar token y usuario en cookies
    Cookies.set("token", response.data.access_token, {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });
    Cookies.set("user", JSON.stringify(response.data.user), {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });

    return response.data;
  },

  async getProfile(): Promise<AuthorizationProfile> {
    const response = await api.get<AuthorizationProfile>("/auth/profile");
    return response.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const payload = { token, newPassword };
    await api.post("/auth/reset-password", payload);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/auth/change-password", { currentPassword, newPassword } satisfies ChangePasswordDto);
  },

  logout() {
    Cookies.remove("token", { path: "/" });
    Cookies.remove("user", { path: "/" });
  },

  getToken(): string | undefined {
    return Cookies.get("token");
  },

  getUser(): User | null {
    const userStr = Cookies.get("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
