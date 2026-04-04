import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentDate: string;
  currentTime: string;
  currentStatus: string;
  customerName: string;
  onRescheduled: () => void;
}

const RescheduleDialog = ({ open, onOpenChange, bookingId, currentDate, currentTime, currentStatus, customerName, onRescheduled }: Props) => {
  const [newDate, setNewDate] = useState(currentDate);
  const [newTime, setNewTime] = useState(currentTime);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!newDate || !newTime) {
      toast({ title: "Data tidak lengkap", description: "Tanggal dan waktu wajib diisi.", variant: "destructive" });
      return;
    }
    if (newDate === currentDate && newTime === currentTime) {
      toast({ title: "Tidak ada perubahan", description: "Pilih tanggal atau waktu yang berbeda.", variant: "destructive" });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Alasan wajib diisi", description: "Berikan alasan reschedule untuk pelanggan.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bookings")
        .update({ booking_date: newDate, booking_time: newTime } as any)
        .eq("id", bookingId);
      if (error) throw error;

      await supabase.from("booking_status_logs").insert({
        booking_id: bookingId,
        old_status: currentStatus,
        new_status: currentStatus,
        changed_by: user.id,
        notes: `Reschedule dari ${currentDate} ${currentTime} ke ${newDate} ${newTime}. Alasan: ${reason}`,
      } as any);

      toast({ title: "Berhasil", description: "Jadwal berhasil diubah." });
      onOpenChange(false);
      onRescheduled();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Reschedule Pesanan
          </DialogTitle>
          <DialogDescription>
            Ubah jadwal pesanan {customerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-3 text-sm">
            <p className="text-muted-foreground">Jadwal saat ini:</p>
            <p className="font-medium text-foreground">{currentDate} • {currentTime}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Baru</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label>Waktu Baru</Label>
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alasan Reschedule <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Contoh: Jadwal bentrok dengan pesanan lain..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Batal
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleDialog;
