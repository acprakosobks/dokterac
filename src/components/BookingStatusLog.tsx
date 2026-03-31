import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History } from "lucide-react";

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

const BookingStatusLog = ({ bookingId }: { bookingId: string }) => {
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

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <History className="h-4 w-4" />Riwayat Status
      </h4>
      <div className="relative pl-4 border-l-2 border-border space-y-3">
        {logs.map((log) => (
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
              </div>
              {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {new Date(log.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingStatusLog;
