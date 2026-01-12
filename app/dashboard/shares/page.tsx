'use client';

import { useEffect, useState } from 'react';
import { sharesService } from '@/lib/services/shares.service';
import { DocumentShare } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, FileText, MoreVertical, Copy, ExternalLink, Ban, Trash2, Eye, Calendar, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function SharesPage() {
  const [receivedShares, setReceivedShares] = useState<DocumentShare[]>([]);
  const [sentShares, setSentShares] = useState<DocumentShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      setLoading(true);
      const [received, sent] = await Promise.all([
        sharesService.getReceived(),
        sharesService.getSent(),
      ]);
      setReceivedShares(received);
      setSentShares(sent);
    } catch (error) {
      console.error('Error loading shares:', error);
      toast.error('Error al cargar los documentos compartidos');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (shareToken: string) => {
    try {
      await sharesService.copyShareLink(shareToken);
      toast.success('Link copiado al portapapeles');
    } catch (error) {
      toast.error('Error al copiar el link');
    }
  };

  const handleRevoke = async (shareId: number) => {
    try {
      await sharesService.revoke(shareId);
      toast.success('Share revocado exitosamente');
      loadShares();
    } catch (error) {
      toast.error('Error al revocar el share');
    }
  };

  const handleDelete = async (shareId: number) => {
    try {
      await sharesService.delete(shareId);
      toast.success('Share eliminado exitosamente');
      loadShares();
    } catch (error) {
      toast.error('Error al eliminar el share');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getShareStatus = (share: DocumentShare) => {
    if (share.revokedAt) {
      return <Badge variant="destructive">Revocado</Badge>;
    }
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return <Badge variant="secondary">Expirado</Badge>;
    }
    if (share.maxViews && share.viewCount >= share.maxViews) {
      return <Badge variant="secondary">Límite alcanzado</Badge>;
    }
    return <Badge variant="default">Activo</Badge>;
  };

  const getShareTarget = (share: DocumentShare) => {
    if (share.user) {
      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{share.user.name}</span>
        </div>
      );
    }
    if (share.role) {
      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="capitalize">{share.role}</span>
        </div>
      );
    }
    if (share.department) {
      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{share.department.name}</span>
        </div>
      );
    }
    if (share.course) {
      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{share.course.name}</span>
        </div>
      );
    }
    if (share.isPublicLink) {
      return (
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          <span>Link público</span>
        </div>
      );
    }
    return <span className="text-muted-foreground">N/A</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Share2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Documentos Compartidos</h1>
          <p className="text-muted-foreground">
            Gestiona los documentos que has compartido y los que han compartido contigo
          </p>
        </div>
      </div>

      <Tabs defaultValue="received" className="space-y-4">
        <TabsList>
          <TabsTrigger value="received" className="gap-2">
            <FileText className="h-4 w-4" />
            Recibidos ({receivedShares.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Share2 className="h-4 w-4" />
            Enviados ({sentShares.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle>Documentos compartidos conmigo</CardTitle>
              <CardDescription>
                Documentos que otros usuarios han compartido contigo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receivedShares.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tienes documentos compartidos</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Compartido por</TableHead>
                      <TableHead>Permisos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vistas</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedShares.map((share) => (
                      <TableRow key={share.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{share.document?.filename}</p>
                              {share.document && (
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(share.document.size)}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{share.sharedBy.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {share.canView && <Badge variant="outline">Ver</Badge>}
                            {share.canDownload && <Badge variant="outline">Descargar</Badge>}
                            {share.canEdit && <Badge variant="outline">Editar</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{getShareStatus(share)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {share.viewCount}
                              {share.maxViews && `/${share.maxViews}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDistanceToNow(new Date(share.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/api/documents/${share.documentId}/download`, '_blank')}
                          >
                            Ver documento
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Documentos que he compartido</CardTitle>
              <CardDescription>
                Gestiona los documentos que has compartido con otros
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentShares.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No has compartido ningún documento</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Compartido con</TableHead>
                      <TableHead>Permisos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vistas</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentShares.map((share) => (
                      <TableRow key={share.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{share.document?.filename}</p>
                              {share.document && (
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(share.document.size)}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getShareTarget(share)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {share.canView && <Badge variant="outline">Ver</Badge>}
                            {share.canDownload && <Badge variant="outline">Descargar</Badge>}
                            {share.canEdit && <Badge variant="outline">Editar</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{getShareStatus(share)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {share.viewCount}
                              {share.maxViews && `/${share.maxViews}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDistanceToNow(new Date(share.createdAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {share.isPublicLink && !share.revokedAt && (
                                <DropdownMenuItem onClick={() => handleCopyLink(share.shareToken)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copiar link
                                </DropdownMenuItem>
                              )}
                              {!share.revokedAt && (
                                <DropdownMenuItem
                                  onClick={() => handleRevoke(share.id)}
                                  className="text-orange-600"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Revocar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(share.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
