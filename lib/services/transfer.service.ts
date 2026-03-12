import api from '../axios';
import {
  TransferHistory,
  CreateTransferDto,
  TransferStats,
} from '../types';

export const transfersService = {
  // Crear una nueva transferencia
  async create(data: CreateTransferDto): Promise<TransferHistory> {
    const response = await api.post('/transfers', data);
    return response.data;
  },

  // Obtener transferencias enviadas
  async getSent(): Promise<TransferHistory[]> {
    const response = await api.get('/transfers/sent');
    return response.data;
  },

  // Obtener transferencias recibidas
  async getReceived(): Promise<TransferHistory[]> {
    const response = await api.get('/transfers/received');
    return response.data;
  },

  // Obtener estadísticas de transferencias
  async getStats(): Promise<TransferStats> {
    const response = await api.get('/transfers/stats');
    return response.data;
  },

  // Obtener historial de transferencias de un documento
  async getDocumentTransfers(documentId: number): Promise<TransferHistory[]> {
    const response = await api.get(`/transfers/document/${documentId}`);
    return response.data;
  },

  // Obtener detalle de una transferencia
  async getById(id: number): Promise<TransferHistory> {
    const response = await api.get(`/transfers/${id}`);
    return response.data;
  },

  // Aceptar (completar) una transferencia
  async complete(id: number): Promise<TransferHistory> {
    const response = await api.patch(`/transfers/${id}/complete`);
    return response.data;
  },

  // Cancelar una transferencia
  async cancel(id: number): Promise<TransferHistory> {
    const response = await api.patch(`/transfers/${id}/cancel`);
    return response.data;
  },
};
