import api from '../axios';
import {
  BatchUpdateDto,
  BatchDeleteDto,
  BatchShareDto,
  BatchExportDto,
  BatchResponse,
} from '../types';

export const batchService = {
  // Actualización masiva de documentos
  async update(data: BatchUpdateDto): Promise<BatchResponse> {
    const response = await api.patch('/batch/update', data);
    return response.data;
  },

  // Eliminación masiva de documentos
  async delete(data: BatchDeleteDto): Promise<BatchResponse> {
    const response = await api.delete('/batch/delete', { data });
    return response.data;
  },

  // Compartir múltiples documentos
  async share(data: BatchShareDto): Promise<BatchResponse> {
    const response = await api.post('/batch/share', data);
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
};
