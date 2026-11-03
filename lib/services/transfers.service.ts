import api from "@/lib/axios";
import type {
  CreateTransferDto,
  TransferHistory,
  TransferStats,
} from "@/lib/types";

export const transfersService = {
  async create(data: CreateTransferDto): Promise<TransferHistory> {
    return (await api.post<TransferHistory>("/transfers", data)).data;
  },

  async createForOwner(data: CreateTransferDto): Promise<TransferHistory> {
    return (await api.post<TransferHistory>("/transfers/admin", data)).data;
  },

  async getSent(): Promise<TransferHistory[]> {
    return (await api.get<TransferHistory[]>("/transfers/sent")).data;
  },

  async getReceived(): Promise<TransferHistory[]> {
    return (await api.get<TransferHistory[]>("/transfers/received")).data;
  },

  async getStats(): Promise<TransferStats> {
    return (await api.get<TransferStats>("/transfers/stats")).data;
  },

  async getById(id: number): Promise<TransferHistory> {
    return (await api.get<TransferHistory>(`/transfers/${id}`)).data;
  },

  async accept(id: number): Promise<TransferHistory> {
    return (await api.patch<TransferHistory>(`/transfers/${id}/accept`)).data;
  },

  async cancel(id: number): Promise<TransferHistory> {
    return (await api.patch<TransferHistory>(`/transfers/${id}/cancel`)).data;
  },
};
