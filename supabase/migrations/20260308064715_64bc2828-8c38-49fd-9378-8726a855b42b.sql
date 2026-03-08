
CREATE TABLE public.salon_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Salon',
  phone TEXT,
  email TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  address TEXT,
  online_booking BOOLEAN NOT NULL DEFAULT true,
  whatsapp_reminders BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view salon settings" ON public.salon_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update salon settings" ON public.salon_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert salon settings" ON public.salon_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_salon_settings_updated_at BEFORE UPDATE ON public.salon_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.salon_settings (name, phone, email, address) VALUES ('Luxe Studio Salon', '+91 98765 43210', 'hello@luxestudio.com', '42 MG Road, Bengaluru, Karnataka 560001');
