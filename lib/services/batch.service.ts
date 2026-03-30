import api from '../axios';
import {
  BatchUpdateDto,
  BatchDeleteDto,
  BatchExportDto,
  BatchResponse,
  DocumentBatch,
  DocumentBatchesResponse,
} from '../types';

export const batchService = {
  // Actualización masiva de documentos
  async update(data: BatchUpdateDto): Promise<BatchResponse> {
    const response = await api.patch('/batch/update', data);
    return response.data;
  },

  async delete(data: BatchDeleteDto): Promise<BatchResponse> {
    const response = await api.post('/batch/delete', data);
    return response.data;
  },

  // Exportar documentos a ZIP
  async export(data: BatchExportDto): Promise<Blob> {
    const response = await api.post('/batch/export', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Restaurar documentos eliminados
  async restore(documentIds: number[]): Promise<BatchResponse> {
    const response = await api.patch('/batch/restore', { documentIds });
    return response.data;
  },

  // Helper: Descargar el ZIP exportado
  async downloadExport(documentIds: number[], filename?: string): Promise<void> {
    const blob = await this.export({ documentIds });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `documents-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ============ Gestión de lotes ============

  async listBatches(params?: { page?: number; limit?: number }): Promise<DocumentBatchesResponse> {
    const response = await api.get<DocumentBatchesResponse>('/batch/document-batches', { params });
    return response.data;
  },

  async getBatch(id: string): Promise<DocumentBatch> {
    const response = await api.get<DocumentBatch>(`/batch/document-batches/${id}`);
    return response.data;
  },

  async deleteBatch(id: string): Promise<{ success: boolean; deletedDocuments: number }> {
    const response = await api.delete<{ success: boolean; deletedDocuments: number }>(
      `/batch/document-batches/${id}`,
    );
    return response.data;
  },

  async downloadBatch(id: string, name?: string): Promise<void> {
    const response = await api.post(`/batch/document-batches/${id}/export`, {}, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = name ? `lote-${name}-${Date.now()}.zip` : `lote-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
