"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/lib/services/notifications.service";
import { Notification, NotificationType, NotificationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  Share2,
  MessageSquare,
  AtSign,
  Upload,
  CheckCircle2,
  XCircle,
  Shield,
  Workflow,
  Archive,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const FILTER_TABS = [
  { value: "all", label: "Todas" },
  { value: NotificationStatus.UNREAD, label: "Sin leer" },
  { value: NotificationStatus.READ, label: "Leídas" },
  { value: NotificationStatus.ARCHIVED, label: "Archivadas" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

function getIcon(type: NotificationType) {
  const map: Record<NotificationType, React.ElementType> = {
    [NotificationType.DOCUMENT_SHARED]: Share2,
    [NotificationType.APPROVAL_REQUESTED]: CheckCircle2,
    [NotificationType.APPROVAL_APPROVED]: CheckCircle2,
    [NotificationType.APPROVAL_REJECTED]: XCircle,
    [NotificationType.COMMENT_ADDED]: MessageSquare,
    [NotificationType.MENTION]: AtSign,
    [NotificationType.DOCUMENT_UPLOADED]: Upload,
    [NotificationType.WORKFLOW_COMPLETED]: Workflow,
    [NotificationType.PERMISSION_GRANTED]: Shield,
  };
  const Icon = map[type] ?? FileText;
  return <Icon className="h-4 w-4" />;
}

function getIconColor(type: NotificationType) {
  const map: Record<NotificationType, string> = {
    [NotificationType.DOCUMENT_SHARED]: "text-blue-600",
    [NotificationType.APPROVAL_REQUESTED]: "text-orange-600",
    [NotificationType.APPROVAL_APPROVED]: "text-green-600",
    [NotificationType.APPROVAL_REJECTED]: "text-red-600",
    [NotificationType.COMMENT_ADDED]: "text-purple-600",
    [NotificationType.MENTION]: "text-yellow-600",
    [NotificationType.DOCUMENT_UPLOADED]: "text-blue-600",
    [NotificationType.WORKFLOW_COMPLETED]: "text-green-600",
    [NotificationType.PERMISSION_GRANTED]: "text-indigo-600",
  };
  return map[type] ?? "text-muted-foreground";
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () =>
      notificationsService.getAll(
        filter === "all" ? undefined : (filter as NotificationStatus)
      ),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      toast.success("Todas las notificaciones marcadas como leídas");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => notificationsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificación archivada");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificación eliminada");
    },
  });

  const handleClick = async (n: Notification) => {
    if (n.status === NotificationStatus.UNREAD) {
      await markAsReadMutation.mutateAsync(n.id);
    }
    if (n.actionUrl) {
      router.push("/dashboard" + n.actionUrl);
    }
  };

  const unreadCount = notifications.filter(
    (n) => n.status === NotificationStatus.UNREAD
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Notificaciones</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} sin leer`
                : "Todo al día"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
        <TabsList>
          {FILTER_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Separator />

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay notificaciones</p>
          <p className="text-sm mt-1">
            {filter === "all"
              ? "Cuando recibas notificaciones aparecerán aquí."
              : "No hay notificaciones en esta categoría."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`
                group relative flex items-start gap-4 rounded-lg p-4 transition-colors
                hover:bg-accent cursor-pointer
                ${n.status === NotificationStatus.UNREAD ? "bg-muted/50" : ""}
              `}
              onClick={() => handleClick(n)}
            >
              {/* Icono */}
              <div className={`mt-0.5 shrink-0 ${getIconColor(n.type)}`}>
                {getIcon(n.type)}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {n.message}
                </p>
                {n.status === NotificationStatus.ARCHIVED && (
                  <Badge variant="secondary" className="text-xs">Archivada</Badge>
                )}
              </div>

              {/* Dot sin leer */}
              {n.status === NotificationStatus.UNREAD && (
                <div className="absolute top-4 right-4 h-2 w-2 bg-primary rounded-full" />
              )}

              {/* Acciones — visibles al hover */}
              <div
                className="absolute right-4 top-4 hidden group-hover:flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {n.status === NotificationStatus.UNREAD && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Marcar como leída"
                    onClick={() => markAsReadMutation.mutate(n.id)}
                    disabled={markAsReadMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                {n.status !== NotificationStatus.ARCHIVED && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Archivar"
                    onClick={() => archiveMutation.mutate(n.id)}
                    disabled={archiveMutation.isPending}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Eliminar"
                  onClick={() => deleteMutation.mutate(n.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
