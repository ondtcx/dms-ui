import api from "@/lib/axios";
import { Document } from "@/lib/types";

export const onlyofficeService = {
  async checkHealth(): Promise<boolean> {
    try {
      const response = await api.get<{ available: boolean }>("/onlyoffice/health");
      return response.data.available;
    } catch {
      return false;
    }
  },

  async createBlank(data: {
    title: string;
    fileType: "docx" | "xlsx" | "pptx" | "txt" | "md";
    categoryId?: number;
    courseId?: number;
    documentTypeId?: number;
  }): Promise<Document> {
    const response = await api.post<Document>("/onlyoffice/create-blank", data);
    return response.data;
  },
};
