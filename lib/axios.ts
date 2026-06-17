import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    // Lista de status codes que no deben mostrar toast de error global
    silentErrors?: number[];
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Error de red o API no disponible
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        toast.error(
          "La solicitud tardó demasiado tiempo. Verifica tu conexión.",
        );
      } else if (error.code === "ERR_NETWORK") {
        toast.error(
          "No se pudo conectar con el servidor. Verifica que la API esté ejecutándose.",
        );
      } else {
        toast.error("Error de conexión. El servidor no está disponible.");
      }
      return Promise.reject(error);
    }

    // Errores HTTP específicos
    const status = error.response.status;
    const silentErrors = error.config?.silentErrors ?? [];
    const silent = silentErrors.includes(status);

    if (status === 401) {
      // Token expirado o inválido — side effect crítico, siempre se ejecuta
      Cookies.remove("token", { path: "/" });
      Cookies.remove("user", { path: "/" });
      const publicPaths = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];
      if (!publicPaths.includes(window.location.pathname)) {
        if (!silent) toast.error("Sesión expirada. Por favor inicia sesión nuevamente.");
        window.location.href = "/auth/login";
      }
    } else if (!silent) {
      if (status === 403) {
        toast.error("No tienes permisos para realizar esta acción.");
      } else if (status === 404) {
        toast.error("Recurso no encontrado.");
      } else if (status === 500) {
        toast.error("Error interno del servidor. Intenta nuevamente más tarde.");
      } else if (status >= 400 && status < 500) {
        const message =
          (error.response.data as { message?: string })?.message ||
          "Error en la solicitud.";
        toast.error(message);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
