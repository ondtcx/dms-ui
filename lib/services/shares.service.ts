import api from '../axios';
import {
  DocumentShare,
  CreateShareDto,
  AccessShareDto,
} from '../types';

export const sharesService = {
  // Crear un nuevo share
  async create(data: CreateShareDto): Promise<DocumentShare> {
    const response = await api.post('/shares', data);
    return response.data;
  },

  // Obtener shares recibidos
  async getReceived(): Promise<DocumentShare[]> {
    const response = await api.get('/shares/received');
    return response.data;
  },

  // Obtener shares enviados
  async getSent(): Promise<DocumentShare[]> {
    const response = await api.get('/shares/sent');
    return response.data;
  },

  // Obtener shares de un documento específico
  async getDocumentShares(documentId: number): Promise<DocumentShare[]> {
    const response = await api.get(`/shares/document/${documentId}`);
    return response.data;
  },

  // Acceder a un share por token
  async accessByToken(
    shareToken: string,
    data?: AccessShareDto
  ): Promise<DocumentShare> {
    const response = await api.get(`/shares/token/${shareToken}`, {
      data,
    });
    return response.data;
  },

  // Revocar un share
  async revoke(shareId: number): Promise<DocumentShare> {
    const response = await api.patch(`/shares/${shareId}/revoke`);
    return response.data;
  },

  // Eliminar un share
  async delete(shareId: number): Promise<{ message: string }> {
    const response = await api.delete(`/shares/${shareId}`);
    return response.data;
  },

  // Copiar link del share al portapapeles
  async copyShareLink(shareToken: string): Promise<string> {
    const link = `${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(link);
    return link;
  },
};
