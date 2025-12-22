"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLogs,
  clearLogs,
  exportLogsAsJson,
  exportLogsAsCsv,
  type LogEntry,
  type LogLevel,
} from "@/lib/logger";
import {
  Trash2,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";

interface LogViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const levelIcons: Record<LogLevel, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <XCircle className="h-4 w-4 text-rose-500" />,
};

const levelColors: Record<LogLevel, string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LogViewerDialog({ open, onOpenChange }: LogViewerDialogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [isClearing, setIsClearing] = useState(false);

  const loadLogs = useCallback(() => {
    const allLogs = getLogs();
    // Sort by timestamp descending (newest first)
    setLogs(
      allLogs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    );
  }, []);

  // Handle dialog open/close
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        loadLogs();
      }
      onOpenChange(isOpen);
    },
    [loadLogs, onOpenChange]
  );

  const handleClearLogs = () => {
    setIsClearing(true);
    clearLogs();
    setLogs([]);
    setTimeout(() => setIsClearing(false), 500);
  };

  const handleExportJson = () => {
    exportLogsAsJson();
  };

  const handleExportCsv = () => {
    exportLogsAsCsv();
  };

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.level === filter);

  const logCounts = {
    all: logs.length,
    info: logs.filter((l) => l.level === "info").length,
    success: logs.filter((l) => l.level === "success").length,
    warning: logs.filter((l) => l.level === "warning").length,
    error: logs.filter((l) => l.level === "error").length,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Log Aktivitas
          </DialogTitle>
          <DialogDescription>
            Riwayat aktivitas dan error yang terjadi di aplikasi. Log disimpan
            secara lokal di browser Anda.
          </DialogDescription>
        </DialogHeader>

        {/* Stats and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between py-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Info className="h-3 w-3" /> {logCounts.info} Info
            </Badge>
            <Badge variant="outline" className="gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> {logCounts.success} Sukses
            </Badge>
            <Badge variant="outline" className="gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" /> {logCounts.warning}{" "}
              Peringatan
            </Badge>
            <Badge variant="outline" className="gap-1 text-rose-600">
              <XCircle className="h-3 w-3" /> {logCounts.error} Error
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as LogLevel | "all")}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua ({logCounts.all})</SelectItem>
                <SelectItem value="info">Info ({logCounts.info})</SelectItem>
                <SelectItem value="success">
                  Sukses ({logCounts.success})
                </SelectItem>
                <SelectItem value="warning">
                  Peringatan ({logCounts.warning})
                </SelectItem>
                <SelectItem value="error">Error ({logCounts.error})</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 min-h-[300px] max-h-[400px] border rounded-lg overflow-hidden">
          <div className="h-full overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">Tidak ada log</p>
                <p className="text-sm">Aktivitas akan tercatat di sini</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{levelIcons[log.level]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${levelColors[log.level]}`}
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          {log.code && (
                            <Badge
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {log.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {log.message}
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded break-all">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearLogs}
              disabled={logs.length === 0 || isClearing}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Hapus Semua
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
