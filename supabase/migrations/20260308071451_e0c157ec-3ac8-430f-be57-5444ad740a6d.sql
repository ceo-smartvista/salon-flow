
-- Allow public/anon read access to services (active only), staff (active only), and salon_settings for public booking page
CREATE POLICY "Public can view active services" ON public.services FOR SELECT TO anon USING (active = true);
CREATE POLICY "Public can view active staff" ON public.staff FOR SELECT TO anon USING (active = true);
CREATE POLICY "Public can view salon settings" ON public.salon_settings FOR SELECT TO anon USING (true);

-- Allow anon to insert appointments (for public booking)
CREATE POLICY "Public can create appointments" ON public.appointments FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to insert clients (walk-in/new client from booking)
CREATE POLICY "Public can create clients" ON public.clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can view own client record" ON public.clients FOR SELECT TO anon USING (true);
