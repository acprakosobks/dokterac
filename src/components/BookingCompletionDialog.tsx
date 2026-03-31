import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Loader2, CheckCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  onCompleted: () => void;
}

const BookingCompletionDialog = ({ open, onOpenChange, bookingId, onCompleted }: Props) => {
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast({ title: "Catatan wajib diisi", description: "Silakan isi catatan penyelesaian sebelum menyelesaikan pesanan.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload photos if any
      for (const photo of photos) {
        const ext = photo.file.name.split(".").pop();
        const path = `${user.id}/${bookingId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("booking-photos").upload(path, photo.file);
        if (uploadErr) throw uploadErr;

        const { error: insertErr } = await supabase.from("booking_completion_photos").insert({
          booking_id: bookingId,
          file_path: path,
          file_name: photo.file.name,
        } as any);
        if (insertErr) throw insertErr;
      }

      // Get current status for log
      const { data: booking } = await supabase.from("bookings").select("status").eq("id", bookingId).single();

      // Update booking status to done with completion notes
      const { error: updateErr } = await supabase.from("bookings").update({
        status: "done",
        completion_notes: notes,
      } as any).eq("id", bookingId);
      if (updateErr) throw updateErr;

      // Log status change
      await supabase.from("booking_status_logs").insert({
        booking_id: bookingId,
        old_status: booking?.status || "on_progress",
        new_status: "done",
        changed_by: user.id,
        notes: `Pesanan diselesaikan: ${notes}`,
      } as any);

      toast({ title: "Berhasil", description: "Pesanan berhasil diselesaikan" });
      setNotes("");
      setPhotos([]);
      onOpenChange(false);
      onCompleted();
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
            <CheckCircle className="h-5 w-5 text-green-500" />
            Selesaikan Pesanan
          </DialogTitle>
          <DialogDescription>
            Isi catatan penyelesaian dan unggah foto dokumentasi (opsional).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="completion-notes">Catatan Penyelesaian <span className="text-destructive">*</span></Label>
            <Textarea
              id="completion-notes"
              placeholder="Jelaskan pekerjaan yang telah dilakukan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto Dokumentasi (opsional)</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-0.5">Tambah</span>
                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Batal
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Selesaikan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingCompletionDialog;
