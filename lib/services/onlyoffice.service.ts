import api from "@/lib/axios";
import { Document } from "@/lib/types";

export const onlyofficeService = {
  async createBlank(data: {
    title: string;
    fileType: "docx" | "xlsx" | "pptx";
    categoryId?: number;
    courseId?: number;
    documentTypeId?: number;
  }): Promise<Document> {
    const response = await api.post<Document>("/onlyoffice/create-blank", data);
    return response.data;
  },
};
