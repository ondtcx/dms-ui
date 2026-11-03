import api from "@/lib/axios";
import type {
  BulkAcceptResult,
  BulkCancelResult,
  BulkTransferResult,
  CreateBulkAdminTransferDto,
  CreateBulkTransferDto,
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

  async createBulk(data: CreateBulkTransferDto): Promise<BulkTransferResult> {
    return (await api.post<BulkTransferResult>("/transfers/bulk", data)).data;
  },

  async createBulkForOwner(
    data: CreateBulkAdminTransferDto,
  ): Promise<BulkTransferResult> {
    return (
      await api.post<BulkTransferResult>("/transfers/bulk/admin", data)
    ).data;
  },

  async acceptBatch(batchId: string): Promise<BulkAcceptResult> {
    return (
      await api.patch<BulkAcceptResult>(
        `/transfers/batch/${batchId}/accept`,
      )
    ).data;
  },

  async cancelBatch(batchId: string): Promise<BulkCancelResult> {
    return (
      await api.patch<BulkCancelResult>(
        `/transfers/batch/${batchId}/cancel`,
      )
    ).data;
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
