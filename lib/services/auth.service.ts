import api from "@/lib/axios";
import { normalizeAuthUser } from "@/lib/auth/normalizers";
import { AuthResponse, LoginDto, RegisterDto, User } from "@/lib/types";
import Cookies from "js-cookie";

export const authService = {
  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", data);
    const normalizedUser = normalizeAuthUser(response.data.user);

    // Guardar token y usuario en cookies
    Cookies.set("token", response.data.access_token, {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });
    Cookies.set("user", JSON.stringify(normalizedUser), {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });

    return { ...response.data, user: normalizedUser };
  },

  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);
    const normalizedUser = normalizeAuthUser(response.data.user);

    // Guardar token y usuario en cookies
    Cookies.set("token", response.data.access_token, {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });
    Cookies.set("user", JSON.stringify(normalizedUser), {
      expires: 30,
      path: "/",
      sameSite: "strict",
    });

    return { ...response.data, user: normalizedUser };
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>("/auth/profile");
    return normalizeAuthUser(response.data);
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
      return normalizeAuthUser(JSON.parse(userStr));
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
