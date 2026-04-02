import { useState, useEffect } from "react";
import { Upload, X, FileCheck, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DocumentSlot {
  type: "identity" | "personal_with_equipment" | "certification";
  label: string;
  description: string;
  required: boolean;
}

const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    type: "identity",
    label: "Foto Identitas (KTP/SIM)",
    description: "Upload foto KTP atau SIM yang masih berlaku",
    required: true,
  },
  {
    type: "personal_with_equipment",
    label: "Foto Pribadi dengan Peralatan",
    description: "Foto diri Anda bersama peralatan servis AC lengkap",
    required: true,
  },
  {
    type: "certification",
    label: "Sertifikasi / Dokumen Pendukung",
    description: "Sertifikat keahlian atau dokumen pendukung lainnya (opsional)",
    required: false,
  },
];

interface UploadedDoc {
  id: string;
  document_type: string;
  file_path: string;
  file_name: string;
}

interface VendorDocumentUploadProps {
  vendorId: string | null;
  userId: string;
}

const VendorDocumentUpload = ({ vendorId, userId }: VendorDocumentUploadProps) => {
  const [uploads, setUploads] = useState<Record<string, UploadedDoc | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const getSignedUrl = async (filePath: string) => {
    if (signedUrls[filePath]) return signedUrls[filePath];
    const { data } = await supabase.storage.from("vendor-documents").createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      setSignedUrls((p) => ({ ...p, [filePath]: data.signedUrl }));
      return data.signedUrl;
    }
    return "";
  };

  useEffect(() => {
    if (!vendorId) return;
    const load = async () => {
      const { data } = await supabase
        .from("vendor_documents")
        .select("*")
        .eq("vendor_id", vendorId);
      if (data) {
        const map: Record<string, UploadedDoc> = {};
        data.forEach((d: any) => {
          map[d.document_type] = d;
        });
        setUploads(map);
        // Pre-fetch signed URLs
        for (const d of data) {
          getSignedUrl(d.file_path);
        }
      }
    };
    load();
  }, [vendorId]);

  const handleUpload = async (type: string, file: File) => {
    if (!vendorId) {
      toast.error("Simpan data perusahaan terlebih dahulu sebelum upload dokumen.");
      return;
    }

    const ext = file.name.split(".").pop();
    const filePath = `${userId}/${vendorId}/${type}_${Date.now()}.${ext}`;

    setUploading((p) => ({ ...p, [type]: true }));
    try {
      // Delete old file if exists
      const existing = uploads[type];
      if (existing) {
        await supabase.storage.from("vendor-documents").remove([existing.file_path]);
        await supabase.from("vendor_documents").delete().eq("id", existing.id);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from("vendor-documents")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Save record
      const { data, error } = await supabase
        .from("vendor_documents")
        .insert({
          vendor_id: vendorId,
          document_type: type,
          file_path: filePath,
          file_name: file.name,
          is_required: type !== "certification",
        })
        .select()
        .single();
      if (error) throw error;

      setUploads((p) => ({ ...p, [type]: data as UploadedDoc }));
      toast.success("Dokumen berhasil diupload!");
    } catch (err: any) {
      toast.error(err.message || "Gagal upload dokumen");
    } finally {
      setUploading((p) => ({ ...p, [type]: false }));
    }
  };

  const handleRemove = async (type: string) => {
    const doc = uploads[type];
    if (!doc) return;
    try {
      await supabase.storage.from("vendor-documents").remove([doc.file_path]);
      await supabase.from("vendor_documents").delete().eq("id", doc.id);
      setUploads((p) => ({ ...p, [type]: null }));
      toast.success("Dokumen dihapus");
    } catch (err: any) {
      toast.error("Gagal menghapus dokumen");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Dokumen Verifikasi
        </CardTitle>
        <CardDescription>
          Upload dokumen yang diperlukan untuk verifikasi vendor. Dokumen dengan tanda <Badge variant="destructive" className="text-[10px] px-1 py-0">Wajib</Badge> harus diupload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCUMENT_SLOTS.map((slot) => {
          const doc = uploads[slot.type];
          const isLoading = uploading[slot.type];
          return (
            <div
              key={slot.type}
              className="p-4 rounded-xl border border-border bg-muted/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    {slot.label}
                    {slot.required ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Wajib</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Opsional</Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{slot.description}</p>
                </div>
              </div>

              {doc ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-background">
                    <img
                      src={getPublicUrl(doc.file_path)}
                      alt={slot.label}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                      <FileCheck className="h-3 w-3" /> Terupload
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(slot.type)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-background/50">
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Klik untuk upload foto</span>
                      <span className="text-[10px] text-muted-foreground">JPG, PNG, max 5MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isLoading || !vendorId}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Ukuran file maksimal 5MB");
                        return;
                      }
                      handleUpload(slot.type, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default VendorDocumentUpload;
