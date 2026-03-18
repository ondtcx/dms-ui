import api from '../axios';
import {
  SearchQueryDto,
  SearchResponse,
  SearchHistory,
} from '../types';

export const searchService = {
  // Buscar documentos
  async search(query: SearchQueryDto): Promise<SearchResponse> {
    const response = await api.get('/search', { params: query });
    return response.data;
  },

  // Obtener sugerencias de búsqueda
  async getSuggestions(query: string): Promise<string[]> {
    const response = await api.get('/search/suggestions', {
      params: { q: query },
    });
    return response.data;
  },

  // Obtener historial de búsquedas
  async getHistory(): Promise<SearchHistory[]> {
    const response = await api.get('/search/history');
    return response.data;
  },

  // Limpiar historial de búsquedas
  async clearHistory(): Promise<void> {
    await api.delete('/search/history');
  },

  // Obtener búsquedas populares
  async getPopular(): Promise<SearchHistory[]> {
    const response = await api.get('/search/popular');
    return response.data;
  },
};
