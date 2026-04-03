
-- 1. Create master_services table with 27 fixed services
CREATE TABLE public.master_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.master_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master services are publicly viewable"
  ON public.master_services FOR SELECT TO public
  USING (true);

INSERT INTO public.master_services (service_name, sort_order) VALUES
  ('Cuci AC 0.5 - 1 PK', 1),
  ('Cuci AC 1.5 - 2 PK', 2),
  ('Tambah Freon R22 0.5 - 1 PK', 3),
  ('Tambah Freon R22 1.5 - 2 PK', 4),
  ('Tambah Freon R32/R410 0.5 - 1 PK', 5),
  ('Tambah Freon R32/R410 1.5 - 2 PK', 6),
  ('Isi Freon R22 0.5 - 1 PK', 7),
  ('Isi Freon R22 1.5 - 2 PK', 8),
  ('Isi Freon R32/R410 0.5 - 1 PK', 9),
  ('Isi Freon R32/R410 1.5 - 2 PK', 10),
  ('Bongkar', 11),
  ('Pasang 0.5 - 1 PK', 12),
  ('Pasang 1.5 - 2 PK', 13),
  ('Bongkar Pasang 0.5 - 1 PK', 14),
  ('Bongkar Pasang 1.5 - 2 PK', 15),
  ('Bobok Tembok /m', 16),
  ('Las Sambungan Pipa Freon /titik', 17),
  ('Las Perbaikan Kebocoran Pipa Freon + Isi Freon', 18),
  ('Pengecekan AC', 19),
  ('Pergantian Kapasitor 0.5-1 PK (Part dan Jasa)', 20),
  ('Pergantian Kapasitor 1.5-2 PK (Part dan Jasa)', 21),
  ('Biaya Apartemen', 22),
  ('Vacuum & Flushing AC', 23),
  ('Flushing Evaporator', 24),
  ('Vacuum', 25),
  ('Cuci AC Inverter 0.5 - 2 PK', 26),
  ('Cuci Besar (Overhaul)', 27);

-- 2. Create vendor_services junction table
CREATE TABLE public.vendor_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  master_service_id uuid NOT NULL REFERENCES public.master_services(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, master_service_id)
);

ALTER TABLE public.vendor_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor services are publicly viewable"
  ON public.vendor_services FOR SELECT TO public
  USING (true);

CREATE POLICY "Vendors can insert own vendor_services"
  ON public.vendor_services FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_services.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Vendors can update own vendor_services"
  ON public.vendor_services FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_services.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Vendors can delete own vendor_services"
  ON public.vendor_services FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.vendors WHERE vendors.id = vendor_services.vendor_id AND vendors.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all vendor_services"
  ON public.vendor_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
