import api from "@/lib/axios";
import { CalendarQueryDto, CalendarResponse } from "../types";

export const calendarService = {
  /**
   * Obtener documentos agrupados por fecha para vista de calendario
   */
  async getDocumentsByDate(
    query?: CalendarQueryDto
  ): Promise<CalendarResponse> {
    const params = new URLSearchParams();

    if (query?.startDate) params.append("startDate", query.startDate);
    if (query?.endDate) params.append("endDate", query.endDate);
    if (query?.categoryId)
      params.append("categoryId", query.categoryId.toString());

    const queryString = params.toString();
    const url = `/documents/calendar${queryString ? `?${queryString}` : ""}`;

    const response = await api.get<CalendarResponse>(url);
    return response.data;
  },
};
