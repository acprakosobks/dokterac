
-- Force RLS on user_roles (ENABLE alone isn't enough without FORCE)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Revoke direct access from anon and authenticated (policies will grant access)
REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_roles TO authenticated;

-- Make vendor-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'vendor-documents';

-- Drop existing storage policies for vendor-documents
DROP POLICY IF EXISTS "vendor_docs_select" ON storage.objects;
DROP POLICY IF EXISTS "vendor_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "vendor_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "vendor_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "Vendors upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Vendors can delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vendor documents" ON storage.objects;

-- SELECT: owner or admin only
CREATE POLICY "vendor_docs_select" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'vendor-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  )
);

-- INSERT: owner only
CREATE POLICY "vendor_docs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: owner only
CREATE POLICY "vendor_docs_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'vendor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- DELETE: owner or admin
CREATE POLICY "vendor_docs_delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'vendor-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  )
);
