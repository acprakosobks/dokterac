-- Allow admins to SELECT all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to UPDATE all bookings
CREATE POLICY "Admins can update all bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to UPDATE all vendors (e.g. activate/suspend)
CREATE POLICY "Admins can update all vendors"
ON public.vendors
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to SELECT all services
CREATE POLICY "Admins can view all services"
ON public.services
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));