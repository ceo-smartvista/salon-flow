
-- Add DELETE policies for tables that need them for the reset feature
CREATE POLICY "Authenticated users can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete commission rules" ON public.commission_rules FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete memberships" ON public.memberships FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete offpeak offers" ON public.offpeak_offers FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete inventory" ON public.inventory FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sale items" ON public.sale_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sales" ON public.sales FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete purchase orders" ON public.purchase_orders FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete inventory usage" ON public.inventory_usage FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete salon settings" ON public.salon_settings FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete consent forms" ON public.consent_forms FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete portfolio" ON public.portfolio FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete appointments" ON public.appointments FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete client memberships" ON public.client_memberships FOR DELETE TO authenticated USING (true);
