
-- Fix staff policies: allow all authenticated users to manage
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
CREATE POLICY "Authenticated users can manage staff" ON public.staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update staff" ON public.staff FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete staff" ON public.staff FOR DELETE TO authenticated USING (true);

-- Fix services policies
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Authenticated users can manage services" ON public.services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update services" ON public.services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete services" ON public.services FOR DELETE TO authenticated USING (true);

-- Fix commission rules policies
DROP POLICY IF EXISTS "Admins can manage commission rules" ON public.commission_rules;
CREATE POLICY "Authenticated users can manage commission rules" ON public.commission_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update commission rules" ON public.commission_rules FOR UPDATE TO authenticated USING (true);

-- Fix memberships policies
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.memberships;
CREATE POLICY "Authenticated users can manage memberships" ON public.memberships FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update memberships" ON public.memberships FOR UPDATE TO authenticated USING (true);

-- Fix offpeak offers policies
DROP POLICY IF EXISTS "Admins can manage offers" ON public.offpeak_offers;
CREATE POLICY "Authenticated users can manage offers" ON public.offpeak_offers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update offers" ON public.offpeak_offers FOR UPDATE TO authenticated USING (true);
