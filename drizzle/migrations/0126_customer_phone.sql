-- WhatsApp informado no checkout (só dígitos), visível para o admin.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone text;
