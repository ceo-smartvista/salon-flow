
-- =============================================
-- SERVICES TABLE
-- =============================================
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  price INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 30,
  commission_pct INTEGER NOT NULL DEFAULT 40,
  is_product BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- STAFF TABLE
-- =============================================
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Stylist',
  base_commission_pct INTEGER NOT NULL DEFAULT 40,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view staff" ON public.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- CLIENTS TABLE
-- =============================================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- APPOINTMENTS TABLE
-- =============================================
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage appointments" ON public.appointments FOR ALL TO authenticated USING (true);

-- =============================================
-- SALES / TRANSACTIONS TABLE
-- =============================================
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  tip INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  commission_pct INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- COMMISSION RULES TABLE
-- =============================================
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  rate_pct INTEGER NOT NULL DEFAULT 40,
  material_deduction INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view commission rules" ON public.commission_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage commission rules" ON public.commission_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- INVENTORY TABLE
-- =============================================
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  unit TEXT NOT NULL DEFAULT 'units',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 5,
  cost_per_unit INTEGER NOT NULL DEFAULT 0,
  supplier TEXT,
  auto_reorder BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage inventory" ON public.inventory FOR ALL TO authenticated USING (true);

CREATE TABLE public.inventory_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  qty_used NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view usage" ON public.inventory_usage FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can log usage" ON public.inventory_usage FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  qty_ordered NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view POs" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create POs" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update POs" ON public.purchase_orders FOR UPDATE TO authenticated USING (true);

-- =============================================
-- PORTFOLIO (BEFORE/AFTER) TABLE
-- =============================================
CREATE TABLE public.portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  before_photo TEXT,
  after_photo TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view portfolio" ON public.portfolio FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage portfolio" ON public.portfolio FOR ALL TO authenticated USING (true);

-- =============================================
-- CONSENT FORMS TABLE
-- =============================================
CREATE TABLE public.consent_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}',
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view consent forms" ON public.consent_forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage consent forms" ON public.consent_forms FOR ALL TO authenticated USING (true);

-- =============================================
-- VIP MEMBERSHIPS TABLE
-- =============================================
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  usage_limit INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view memberships" ON public.memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage memberships" ON public.memberships FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.client_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  usage_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.client_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view client memberships" ON public.client_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage client memberships" ON public.client_memberships FOR ALL TO authenticated USING (true);

-- =============================================
-- OFF-PEAK OFFERS TABLE
-- =============================================
CREATE TABLE public.offpeak_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  discount_pct INTEGER NOT NULL DEFAULT 15,
  day_of_week INTEGER NOT NULL,
  start_hour INTEGER NOT NULL DEFAULT 14,
  end_hour INTEGER NOT NULL DEFAULT 17,
  active BOOLEAN NOT NULL DEFAULT true,
  auto_notify BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.offpeak_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view offers" ON public.offpeak_offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage offers" ON public.offpeak_offers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- STORAGE BUCKET FOR PHOTOS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('salon-photos', 'salon-photos', true);

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'salon-photos');

CREATE POLICY "Anyone can view salon photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'salon-photos');

CREATE POLICY "Authenticated users can update photos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'salon-photos');

CREATE POLICY "Authenticated users can delete photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'salon-photos');
