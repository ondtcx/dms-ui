import api from '@/lib/axios';
import { DocumentComposition, DocumentCompositionItem } from '@/lib/types';

export const compositionService = {
  async getComposition(documentId: number): Promise<DocumentComposition> {
    const res = await api.get(`/documents/${documentId}/composition`);
    return res.data;
  },

  async addComponent(
    documentId: number,
    data: { childId: number; label?: string; insertAfterPage?: number },
  ): Promise<DocumentCompositionItem> {
    const res = await api.post(`/documents/${documentId}/composition`, data);
    return res.data;
  },

  async removeComponent(documentId: number, childId: number): Promise<void> {
    await api.delete(`/documents/${documentId}/composition/${childId}`);
  },

  async updateComponent(
    documentId: number,
    childId: number,
    data: { label?: string; insertAfterPage?: number | null },
  ): Promise<DocumentCompositionItem> {
    const res = await api.patch(`/documents/${documentId}/composition/${childId}`, data);
    return res.data;
  },

  async reorder(
    documentId: number,
    items: { childId: number; order: number }[],
  ): Promise<void> {
    await api.patch(`/documents/${documentId}/composition/reorder`, { items });
  },

  async downloadMerged(documentId: number): Promise<Blob> {
    const res = await api.get(`/documents/${documentId}/composition/download`, {
      responseType: 'blob',
    });
    return res.data;
  },
};
