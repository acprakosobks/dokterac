import { useState, useEffect } from "react";
import { FileCheck, ExternalLink, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const DOC_LABELS: Record<string, string> = {
  identity: "Foto Identitas (KTP/SIM)",
  personal_with_equipment: "Foto Pribadi + Peralatan",
  certification: "Sertifikasi / Dokumen Pendukung",
};

interface VendorDocumentsViewerProps {
  vendorId: string;
}

interface DocRecord {
  id: string;
  document_type: string;
  file_path: string;
  file_name: string;
  is_required: boolean;
  created_at: string;
}

const VendorDocumentsViewer = ({ vendorId }: VendorDocumentsViewerProps) => {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("vendor_documents")
        .select("*")
        .eq("vendor_id", vendorId);
      const docList = (data as DocRecord[]) || [];
      setDocs(docList);
      // Fetch signed URLs for all docs
      const urls: Record<string, string> = {};
      for (const d of docList) {
        const { data: urlData } = await supabase.storage.from("vendor-documents").createSignedUrl(d.file_path, 3600);
        if (urlData?.signedUrl) urls[d.file_path] = urlData.signedUrl;
      }
      setSignedUrls(urls);
      setLoading(false);
    };
    load();
  }, [vendorId]);

  const getUrl = (filePath: string) => signedUrls[filePath] || "";

  if (loading) {
    return <div className="text-sm text-muted-foreground">Memuat dokumen...</div>;
  }

  const requiredTypes = ["identity", "personal_with_equipment"];
  const hasAllRequired = requiredTypes.every((t) => docs.some((d) => d.document_type === t));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileCheck className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Dokumen Verifikasi</span>
        {hasAllRequired ? (
          <Badge variant="default" className="text-[10px]">Lengkap</Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">Belum Lengkap</Badge>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada dokumen yang diupload.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {["identity", "personal_with_equipment", "certification"].map((type) => {
            const doc = docs.find((d) => d.document_type === type);
            const label = DOC_LABELS[type] || type;
            const isRequired = type !== "certification";
            return (
              <div key={type} className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{label}</span>
                  {isRequired ? (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0">Wajib</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Opsional</Badge>
                  )}
                </div>
                {doc ? (
                  <a
                    href={getUrl(doc.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <div className="relative h-32 rounded-md overflow-hidden border border-border bg-background">
                      <img
                        src={getPublicUrl(doc.file_path)}
                        alt={label}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ExternalLink className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{doc.file_name}</p>
                  </a>
                ) : (
                  <div className="h-20 rounded-md border border-dashed border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {isRequired ? "⚠️ Belum diupload" : "Tidak diupload"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorDocumentsViewer;
