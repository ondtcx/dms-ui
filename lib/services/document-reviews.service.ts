import api from '@/lib/axios';
import type { DocumentReview } from '@/lib/types';

export const documentReviewService = {
  async pending(): Promise<DocumentReview[]> {
    return (await api.get<DocumentReview[]>('/document-reviews/pending')).data;
  },
  async get(documentId: number): Promise<DocumentReview> {
    return (await api.get<DocumentReview>(`/document-reviews/${documentId}`)).data;
  },
  async submit(
    documentId: number,
    payload: { reviewerId?: string; reviewerName?: string } = {},
  ) {
    return (
      await api.post<DocumentReview>(
        `/document-reviews/${documentId}/submit`,
        payload,
      )
    ).data;
  },
  async approve(documentId: number, observation?: string) {
    return (
      await api.post<DocumentReview>(
        `/document-reviews/${documentId}/approve`,
        { observation },
      )
    ).data;
  },
  async returnDocument(documentId: number, observation: string) {
    return (
      await api.post<DocumentReview>(
        `/document-reviews/${documentId}/return`,
        { observation },
      )
    ).data;
  },
};
