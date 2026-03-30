-- Create storage bucket for vendor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-documents', 'vendor-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create vendor_documents table
CREATE TABLE public.vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('identity', 'personal_with_equipment', 'certification')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_documents ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own documents
CREATE POLICY "Vendors can view own documents"
  ON public.vendor_documents FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_documents.vendor_id AND vendors.user_id = auth.uid()
  ));

-- Vendors can insert their own documents
CREATE POLICY "Vendors can insert own documents"
  ON public.vendor_documents FOR INSERT
  TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_documents.vendor_id AND vendors.user_id = auth.uid()
  ));

-- Vendors can delete their own documents
CREATE POLICY "Vendors can delete own documents"
  ON public.vendor_documents FOR DELETE
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_documents.vendor_id AND vendors.user_id = auth.uid()
  ));

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
  ON public.vendor_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for vendor-documents bucket
CREATE POLICY "Authenticated users can upload vendor documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vendor-documents');

CREATE POLICY "Anyone can view vendor documents"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'vendor-documents');

CREATE POLICY "Users can delete own vendor documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
