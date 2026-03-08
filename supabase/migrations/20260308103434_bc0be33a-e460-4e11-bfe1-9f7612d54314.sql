
-- Tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL,
  owner_email text NOT NULL,
  license_start timestamp with time zone NOT NULL DEFAULT now(),
  license_end timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  grace_days integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners can view own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

-- Tenant payments table
CREATE TABLE public.tenant_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount integer NOT NULL DEFAULT 0,
  payment_date timestamp with time zone NOT NULL DEFAULT now(),
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage payments" ON public.tenant_payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners can view own payments" ON public.tenant_payments
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_user_id = auth.uid()));

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
