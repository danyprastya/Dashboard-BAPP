"use client";

import { useNotifications } from "@/components/providers/notification-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Clock,
  FileText,
  Info,
  XCircle,
  ChevronRight,
} from "lucide-react";
import {
  priorityColors,
  priorityBorderColors,
  typeLabels,
  type Notification,
  type NotificationType,
} from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

// Icon mapping for notification types
const typeIcons: Record<NotificationType, React.ReactNode> = {
  deadline_warning: <AlertTriangle className="h-4 w-4" />,
  progress_update: <Clock className="h-4 w-4" />,
  contract_created: <FileText className="h-4 w-4" />,
  contract_deleted: <XCircle className="h-4 w-4" />,
  reminder: <Bell className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.timestamp), {
    addSuffix: true,
    locale: id,
  });

  return (
    <div
      className={`relative p-3 border-l-4 ${
        priorityBorderColors[notification.priority]
      } ${
        notification.read ? "bg-background" : "bg-muted/50"
      } hover:bg-muted/30 transition-colors`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`p-2 rounded-full ${
            priorityColors[notification.priority]
          }`}
        >
          {typeIcons[notification.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">
              {typeLabels[notification.type]}
            </span>
            {!notification.read && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                Baru
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium leading-tight">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onRead(notification.id)}
              title="Tandai sudah dibaca"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(notification.id)}
            title="Hapus"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Action URL indicator */}
      {notification.actionUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 text-xs w-full justify-between"
          onClick={() => window.open(notification.actionUrl, "_blank")}
        >
          Lihat Detail
          <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function NotificationSidebar() {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  } = useNotifications();

  // Group notifications by priority
  const urgentNotifications = notifications.filter(
    (n) => n.priority === "urgent"
  );
  const highNotifications = notifications.filter((n) => n.priority === "high");
  const otherNotifications = notifications.filter(
    (n) => n.priority === "medium" || n.priority === "low"
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifikasi
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
          </div>
          <SheetDescription>
            {notifications.length === 0
              ? "Tidak ada notifikasi"
              : `${notifications.length} notifikasi, ${unreadCount} belum dibaca`}
          </SheetDescription>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Tandai Semua Dibaca
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={clearNotifications}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus Semua
              </Button>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tidak ada notifikasi</p>
              <p className="text-xs text-muted-foreground mt-1">
                Notifikasi akan muncul di sini
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Urgent notifications */}
              {urgentNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950 sticky top-0 z-10">
                    <span className="text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Mendesak ({urgentNotifications.length})
                    </span>
                  </div>
                  {urgentNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}

              {/* High priority notifications */}
              {highNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950 sticky top-0 z-10">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Penting ({highNotifications.length})
                    </span>
                  </div>
                  {highNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}

              {/* Other notifications */}
              {otherNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted sticky top-0 z-10">
                    <span className="text-xs font-medium text-muted-foreground">
                      Lainnya ({otherNotifications.length})
                    </span>
                  </div>
                  {otherNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Notification bell button component for header
export function NotificationBell() {
  const { unreadCount, setIsOpen } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      onClick={() => setIsOpen(true)}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
