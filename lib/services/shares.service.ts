import { normalizeShare } from "@/lib/auth/normalizers";
import api from "../axios";
import { DocumentShare, CreateShareDto } from "../types";

export const sharesService = {
  // Obtener shares enviados por el usuario actual
  async getSent(): Promise<DocumentShare[]> {
    const response = await api.get<DocumentShare[]>('/shares/sent');
    return response.data.map((share) => normalizeShare(share));
  },

  // Obtener shares recibidos por el usuario actual
  async getReceived(): Promise<DocumentShare[]> {
    const response = await api.get<DocumentShare[]>('/shares/received');
    return response.data.map((share) => normalizeShare(share));
  },

  // Obtener todos los shares de un documento específico
  async getDocumentShares(documentId: number): Promise<DocumentShare[]> {
    const response = await api.get<DocumentShare[]>(`/shares/document/${documentId}`);
    return response.data.map((share) => normalizeShare(share));
  },

  // Crear un nuevo share
  async create(data: CreateShareDto): Promise<DocumentShare> {
    const response = await api.post<DocumentShare>('/shares', data);
    return normalizeShare(response.data);
  },

  // Revocar un share (no se puede acceder más, pero queda el registro)
  async revoke(id: number): Promise<DocumentShare> {
    const response = await api.patch(`/shares/${id}/revoke`);
    return response.data;
  },

  // Eliminar un share permanentemente
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/shares/${id}`);
    return response.data;
  },
};
