"use client";

import { useEffect, useState } from "react";
import { notificationsService } from "@/lib/services/notifications.service";
import { Notification, NotificationType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function NotificationsDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();

    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [open]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getAll();
      setNotifications(data.slice(0, 10)); // Only show latest 10
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const handleMarkAsRead = async (
    notificationId: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(notificationId);
      loadNotifications();
      loadUnreadCount();
    } catch (error) {
      toast.error("Error al marcar como leída");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      loadNotifications();
      loadUnreadCount();
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      toast.error("Error al marcar todas como leídas");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === "UNREAD") {
      await notificationsService.markAsRead(notification.id);
      loadUnreadCount();
    }

    if (notification.actionUrl) {
      console.log("Navegando a:", notification.actionUrl);
      router.push("/dashboard" + notification.actionUrl);
      setOpen(false);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const icons = {
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

    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getNotificationColor = (type: NotificationType) => {
    const colors = {
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

    return colors[type] || "text-muted-foreground";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-7 px-2 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <Separator />

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Cargando notificaciones...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tienes notificaciones</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    group relative rounded-md p-3 hover:bg-accent cursor-pointer transition-colors
                    ${notification.status === "UNREAD" ? "bg-muted/50" : ""}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 ${getNotificationColor(notification.type)}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-none line-clamp-1">
                          {notification.title}
                        </p>
                        {notification.status === "UNREAD" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) =>
                              handleMarkAsRead(notification.id, e)
                            }
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                  {notification.status === "UNREAD" && (
                    <div className="absolute top-3 right-3 h-2 w-2 bg-primary rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-xs"
            onClick={() => {
              router.push("/dashboard/notifications");
              setOpen(false);
            }}
          >
            Ver todas las notificaciones
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
