import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Timer } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  on_progress: "Dalam Pengerjaan",
  done: "Selesai",
  cancelled: "Dibatalkan",
};

interface LogEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "< 1 menit";
  if (totalMinutes < 60) return `${totalMinutes} menit`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) return `${hours} jam ${mins > 0 ? `${mins} mnt` : ""}`.trim();
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days} hari ${remHours > 0 ? `${remHours} jam` : ""}`.trim();
}

interface Props {
  bookingId: string;
  showSLA?: boolean;
}

const BookingStatusLog = ({ bookingId, showSLA = false }: Props) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("booking_status_logs")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (data) setLogs(data as LogEntry[]);
    };
    fetch();
  }, [bookingId]);

  if (logs.length === 0) return null;

  // Calculate SLA durations between consecutive status changes
  const slaDurations: { from: string; to: string; duration: number }[] = [];
  for (let i = 0; i < logs.length - 1; i++) {
    const fromTime = new Date(logs[i].created_at).getTime();
    const toTime = new Date(logs[i + 1].created_at).getTime();
    slaDurations.push({
      from: logs[i].new_status,
      to: logs[i + 1].new_status,
      duration: toTime - fromTime,
    });
  }

  const totalDuration = logs.length >= 2
    ? new Date(logs[logs.length - 1].created_at).getTime() - new Date(logs[0].created_at).getTime()
    : 0;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <History className="h-4 w-4" />Riwayat Status
      </h4>
      <div className="relative pl-4 border-l-2 border-border space-y-3">
        {logs.map((log, index) => (
          <div key={log.id} className="relative">
            <div className="absolute -left-[calc(0.5rem+1px)] top-1.5 h-2 w-2 rounded-full bg-primary" />
            <div className="text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                {log.old_status && (
                  <>
                    <span className="text-muted-foreground">{STATUS_LABELS[log.old_status] || log.old_status}</span>
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <span className="font-medium">{STATUS_LABELS[log.new_status] || log.new_status}</span>
                {showSLA && index > 0 && slaDurations[index - 1] && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    <Timer className="h-2.5 w-2.5" />
                    {formatDuration(slaDurations[index - 1].duration)}
                  </span>
                )}
              </div>
              {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {new Date(log.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {showSLA && totalDuration > 0 && (
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2 mt-2">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Total durasi:</span>
          <span className="font-medium">{formatDuration(totalDuration)}</span>
        </div>
      )}
    </div>
  );
};

export default BookingStatusLog;
