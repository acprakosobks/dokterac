import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentStatus: string;
  onCancelled: () => void;
}

const CancelBookingDialog = ({ open, onOpenChange, bookingId, currentStatus, onCancelled }: Props) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: "Alasan wajib diisi", description: "Silakan isi alasan pembatalan.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("bookings").update({ status: "cancelled" } as any).eq("id", bookingId);
      if (error) throw error;

      await supabase.from("booking_status_logs").insert({
        booking_id: bookingId,
        old_status: currentStatus,
        new_status: "cancelled",
        changed_by: user.id,
        notes: `Dibatalkan: ${reason}`,
      } as any);

      toast({ title: "Berhasil", description: "Pesanan dibatalkan" });
      setReason("");
      onOpenChange(false);
      onCancelled();
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
            <XCircle className="h-5 w-5 text-destructive" />
            Batalkan Pesanan
          </DialogTitle>
          <DialogDescription>
            Masukkan alasan pembatalan pesanan ini.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Alasan Pembatalan <span className="text-destructive">*</span></Label>
            <Textarea
              id="cancel-reason"
              placeholder="Jelaskan alasan pembatalan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Kembali
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Batalkan Pesanan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelBookingDialog;
