
-- Add new values to booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'on_progress';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'done';

-- Create booking_status_logs table for tracking all status changes
CREATE TABLE public.booking_status_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_status_logs ENABLE ROW LEVEL SECURITY;

-- Vendors can view logs of their own bookings
CREATE POLICY "Vendors can view own booking logs" ON public.booking_status_logs
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.vendors v ON v.id = b.vendor_id
    WHERE b.id = booking_status_logs.booking_id AND v.user_id = auth.uid()
  ));

-- Vendors can insert logs for their own bookings
CREATE POLICY "Vendors can insert own booking logs" ON public.booking_status_logs
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.vendors v ON v.id = b.vendor_id
    WHERE b.id = booking_status_logs.booking_id AND v.user_id = auth.uid()
  ));

-- Admins can view all logs
CREATE POLICY "Admins can view all booking logs" ON public.booking_status_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create booking_completion_photos table
CREATE TABLE public.booking_completion_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_completion_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own completion photos" ON public.booking_completion_photos
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.vendors v ON v.id = b.vendor_id
    WHERE b.id = booking_completion_photos.booking_id AND v.user_id = auth.uid()
  ));

CREATE POLICY "Vendors can insert own completion photos" ON public.booking_completion_photos
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.vendors v ON v.id = b.vendor_id
    WHERE b.id = booking_completion_photos.booking_id AND v.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all completion photos" ON public.booking_completion_photos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add completion_notes column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Create storage bucket for booking completion photos
INSERT INTO storage.buckets (id, name, public) VALUES ('booking-photos', 'booking-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for booking-photos bucket
CREATE POLICY "Authenticated users can upload booking photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'booking-photos');

CREATE POLICY "Anyone can view booking photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'booking-photos');

CREATE POLICY "Authenticated users can delete own booking photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'booking-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
