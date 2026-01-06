"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getNotifications,
  addNotification as addNotif,
  markAsRead as markRead,
  markAllAsRead as markAllRead,
  deleteNotification as deleteNotif,
  clearNotifications as clearNotifs,
  getUnreadCount,
  type Notification,
} from "@/lib/notifications";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "read">
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(() => {
    const notifs = getNotifications();
    setNotifications(notifs);
    setUnreadCount(getUnreadCount());
  }, []);

  // Load notifications on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for storage changes (for cross-tab sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "bapp_notifications") {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refresh]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      addNotif(notification);
      refresh();
    },
    [refresh]
  );

  const markAsRead = useCallback(
    (id: string) => {
      markRead(id);
      refresh();
    },
    [refresh]
  );

  const markAllAsRead = useCallback(() => {
    markAllRead();
    refresh();
  }, [refresh]);

  const deleteNotification = useCallback(
    (id: string) => {
      deleteNotif(id);
      refresh();
    },
    [refresh]
  );

  const clearNotifications = useCallback(() => {
    clearNotifs();
    refresh();
  }, [refresh]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearNotifications,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
}

// Helper hook to create notifications easily
export function useCreateNotification() {
  const { addNotification } = useNotifications();

  return {
    notifySuccess: (title: string, message: string) =>
      addNotification({ type: "system", priority: "low", title, message }),
    notifyInfo: (title: string, message: string) =>
      addNotification({ type: "system", priority: "medium", title, message }),
    notifyWarning: (title: string, message: string) =>
      addNotification({ type: "reminder", priority: "high", title, message }),
    notifyUrgent: (title: string, message: string) =>
      addNotification({
        type: "deadline_warning",
        priority: "urgent",
        title,
        message,
      }),
    notifyProgressUpdate: (
      contractName: string,
      month: string,
      percentage: number
    ) =>
      addNotification({
        type: "progress_update",
        priority: percentage === 100 ? "low" : "medium",
        title: `Progress Updated: ${contractName}`,
        message: `Progress bulan ${month} diperbarui menjadi ${percentage}%`,
        metadata: { contractName, month, percentage },
      }),
    notifyContractCreated: (contractName: string, customerName: string) =>
      addNotification({
        type: "contract_created",
        priority: "low",
        title: "Kontrak Baru Ditambahkan",
        message: `Kontrak "${contractName}" untuk ${customerName} berhasil dibuat.`,
        metadata: { contractName, customerName },
      }),
    notifyContractDeleted: (contractName: string) =>
      addNotification({
        type: "contract_deleted",
        priority: "medium",
        title: "Kontrak Dihapus",
        message: `Kontrak "${contractName}" telah dihapus dari sistem.`,
        metadata: { contractName },
      }),
  };
}
