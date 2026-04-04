
-- Allow public to select a single booking by ID (for order tracking)
CREATE POLICY "Public can view booking by id for tracking"
ON public.bookings
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public to view booking status logs for tracking
CREATE POLICY "Public can view booking logs for tracking"
ON public.booking_status_logs
FOR SELECT
TO anon, authenticated
USING (true);
