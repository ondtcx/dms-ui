import api from '../axios';
import {
  DocumentComment,
  CreateCommentDto,
} from '../types';

export const commentsService = {
  // Obtener comentarios de un documento
  async getDocumentComments(documentId: number): Promise<DocumentComment[]> {
    const response = await api.get(`/comments/document/${documentId}`);
    return response.data;
  },

  // Crear un nuevo comentario
  async create(data: CreateCommentDto): Promise<DocumentComment> {
    const response = await api.post('/comments', data);
    return response.data;
  },

  // Actualizar un comentario
  async update(commentId: number, content: string): Promise<DocumentComment> {
    const response = await api.patch(`/comments/${commentId}`, { content });
    return response.data;
  },

  // Eliminar un comentario (soft delete)
  async delete(commentId: number): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  },

  // Agregar reacción a un comentario
  async addReaction(commentId: number, emoji: string): Promise<void> {
    await api.post(`/comments/${commentId}/reactions`, { emoji });
  },

  // Quitar reacción de un comentario
  async removeReaction(commentId: number, emoji: string): Promise<void> {
    await api.delete(`/comments/${commentId}/reactions/${emoji}`);
  },
};
