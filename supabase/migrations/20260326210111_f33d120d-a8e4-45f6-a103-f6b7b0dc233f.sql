-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Vendors table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  slug VARCHAR NOT NULL UNIQUE,
  company_name VARCHAR NOT NULL,
  whatsapp_number VARCHAR NOT NULL,
  email VARCHAR,
  address_full TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  operational_hours JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors are publicly viewable" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Users can create their own vendor profile" ON public.vendors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vendor profile" ON public.vendors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vendor profile" ON public.vendors FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  service_name VARCHAR NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are publicly viewable" ON public.services FOR SELECT USING (true);
CREATE POLICY "Vendors can manage their own services" ON public.services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors can update their own services" ON public.services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors can delete their own services" ON public.services FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_name VARCHAR NOT NULL,
  customer_whatsapp VARCHAR NOT NULL,
  customer_email VARCHAR,
  customer_latitude FLOAT8,
  customer_longitude FLOAT8,
  customer_address_detail TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  notes TEXT,
  selected_services JSONB DEFAULT '[]',
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a booking" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Vendors can view their bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors can update their bookings" ON public.bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.vendors WHERE id = vendor_id AND user_id = auth.uid())
);

CREATE INDEX idx_vendors_slug ON public.vendors (slug);
CREATE INDEX idx_vendors_user_id ON public.vendors (user_id);
CREATE INDEX idx_services_vendor_id ON public.services (vendor_id);
CREATE INDEX idx_bookings_vendor_id ON public.bookings (vendor_id);
CREATE INDEX idx_bookings_date ON public.bookings (booking_date, booking_time);