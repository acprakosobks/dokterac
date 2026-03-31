import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon } from "lucide-react";

interface Photo {
  id: string;
  file_path: string;
  file_name: string;
}

const BookingCompletionPhotos = ({ bookingId }: { bookingId: string }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("booking_completion_photos")
        .select("*")
        .eq("booking_id", bookingId);
      if (data) setPhotos(data as Photo[]);
    };
    fetch();
  }, [bookingId]);

  if (photos.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />Foto Penyelesaian
      </h4>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => {
          const { data } = supabase.storage.from("booking-photos").getPublicUrl(photo.file_path);
          return (
            <a key={photo.id} href={data.publicUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={data.publicUrl}
                alt={photo.file_name}
                className="w-20 h-20 object-cover rounded-lg border border-border hover:ring-2 ring-primary/30 transition"
              />
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default BookingCompletionPhotos;
