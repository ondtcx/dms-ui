'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { calendarService } from '@/lib/services/calendar.service';
import { categoriesService } from '@/lib/services/categories.service';
import { sectionsService } from '@/lib/services/sections.service';
import { Document, CalendarEvent, Category } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, FileText, Filter, Download, Eye, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { documentsService } from '@/lib/services/documents.service';
import { useRouter } from 'next/navigation';

// Configurar el localizador para español
const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Mensajes en español para el calendario
const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Documento',
  noEventsInRange: 'No hay documentos en este rango',
  showMore: (total: number) => `+ Ver más (${total})`,
};

export default function CalendarioPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');

  // Filtros
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [sectionFilter, setSectionFilter] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Modal de detalles
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Modal de previsualización
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Cargar categorías y secciones
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [categoriesData, sectionsData] = await Promise.all([
          categoriesService.getAll(),
          sectionsService.getStats(),
        ]);
        setCategories(categoriesData);
        setSections(sectionsData);
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };
    loadFilters();
  }, []);

  // Cargar documentos del mes actual
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const data = await calendarService.getDocumentsByDate({
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        categoryId: categoryFilter,
        sectionId: sectionFilter,
      });

      setDocuments(data.documents);

      // Convertir documentos a eventos del calendario
      const calendarEvents: CalendarEvent[] = data.documents.map((doc) => ({
        id: doc.id,
        title: doc.filename,
        start: new Date(doc.createdAt),
        end: new Date(doc.createdAt),
        resource: doc,
        color: doc.category?.color || doc.section?.color || '#3b82f6',
      }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Error al cargar los documentos del calendario');
    } finally {
      setLoading(false);
    }
  }, [currentDate, categoryFilter, sectionFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Navegar entre meses
  const handleNavigate = (action: 'prev' | 'next' | 'today') => {
    if (action === 'prev') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (action === 'next') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(new Date());
    }
  };

  // Click en un evento
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDocument(event.resource);
    setShowDetailsModal(true);
  };

  // Descargar documento
  const handleDownload = async (doc: Document) => {
    try {
      const blob = await documentsService.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error al descargar archivo');
    }
  };

  // Previsualizar documento
  const handlePreview = async (doc: Document) => {
    setPreviewDocument(doc);
    setShowPreviewModal(true);
    setLoadingPreview(true);

    try {
      const blob = await documentsService.view(doc.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      toast.error('Error al cargar la vista previa');
      setShowPreviewModal(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Limpiar URL del blob cuando se cierra el modal
  useEffect(() => {
    if (!showPreviewModal && previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      setPreviewDocument(null);
    }
  }, [showPreviewModal, previewUrl]);

  // Estilo personalizado para los eventos
  const eventStyleGetter = (event: CalendarEvent) => {
    const style = {
      backgroundColor: event.color || '#3b82f6',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '12px',
      padding: '2px 5px',
    };
    return { style };
  };

  // Estadísticas del período actual
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const byCategory = documents.reduce((acc, doc) => {
      const catName = doc.category?.name || 'Sin categoría';
      acc[catName] = (acc[catName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySection = documents.reduce((acc, doc) => {
      const secName = doc.section?.name || 'Sin sección';
      acc[secName] = (acc[secName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalDocs, byCategory, bySection };
  }, [documents]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Calendario de Documentos</h1>
          <p className="text-muted-foreground">
            Vista cronológica de todos tus documentos
          </p>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos este mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <p className="text-xs text-muted-foreground">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por categoría</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(stats.byCategory).slice(0, 3).map(([cat, count]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{cat}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por sección</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(stats.bySection).slice(0, 3).map(([sec, count]) => (
                <div key={sec} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{sec}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles y filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Navegación de mes */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('today')}>
                Hoy
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold ml-2">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Select
                value={categoryFilter?.toString() || 'all'}
                onValueChange={(value) => setCategoryFilter(value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sectionFilter?.toString() || 'all'}
                onValueChange={(value) => setSectionFilter(value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sección" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las secciones</SelectItem>
                  {sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id.toString()}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendario */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div style={{ height: 600 }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                messages={messages}
                culture="es"
                date={currentDate}
                onNavigate={(date) => setCurrentDate(date)}
                view={view}
                onView={(view) => setView(view)}
                views={['month', 'week', 'day', 'agenda']}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles del documento */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.filename}
            </DialogTitle>
            <DialogDescription>
              Detalles del documento
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Información</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamaño:</span>
                      <span>{formatFileSize(selectedDocument.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{selectedDocument.mimetype}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subido por:</span>
                      <span>{selectedDocument.uploadedBy.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{format(new Date(selectedDocument.createdAt), 'PPP', { locale: es })}</span>
                    </div>
                  </div>
                </div>

                {selectedDocument.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground">{selectedDocument.description}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedDocument.category && (
                    <Badge variant="outline" style={{ borderColor: selectedDocument.category.color }}>
                      <span style={{ color: selectedDocument.category.color }}>{selectedDocument.category.name}</span>
                    </Badge>
                  )}
                  {selectedDocument.section && (
                    <Badge variant="outline" style={{ borderColor: selectedDocument.section.color }}>
                      <span style={{ color: selectedDocument.section.color }}>{selectedDocument.section.name}</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  Cerrar
                </Button>
                <Button variant="outline" onClick={() => handlePreview(selectedDocument)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                <Button onClick={() => handleDownload(selectedDocument)}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de vista previa de documento */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista Previa: {previewDocument?.filename}</DialogTitle>
            <DialogDescription>
              {previewDocument?.description || 'Previsualización del documento'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 h-full">
            {loadingPreview ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-muted-foreground mt-4">
                  Cargando vista previa...
                </p>
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border rounded-md"
                title={previewDocument?.filename}
              />
            ) : null}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              onClick={() => previewDocument && router.push(`/dashboard/documents/${previewDocument.id}`)}
              disabled={!previewDocument}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver más opciones
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
              >
                Cerrar
              </Button>
              {previewDocument && (
                <Button
                  onClick={() => handleDownload(previewDocument)}
                  disabled={loadingPreview}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
