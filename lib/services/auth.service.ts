import api from "@/lib/axios";
import { AuthResponse, LoginDto, RegisterDto, User } from "@/lib/types";
import Cookies from "js-cookie";

export const authService = {
  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", data);

    // Guardar token y usuario en cookies
    Cookies.set("token", response.data.access_token, { expires: 1 }); // 1 día
    Cookies.set("user", JSON.stringify(response.data.user), { expires: 1 });

    return response.data;
  },

  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);

    // Guardar token y usuario en cookies
    Cookies.set("token", response.data.access_token, { expires: 1 });
    Cookies.set("user", JSON.stringify(response.data.user), { expires: 1 });

    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>("/auth/profile");
    return response.data;
  },

  logout() {
    Cookies.remove("token");
    Cookies.remove("user");
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
