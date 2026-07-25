UPDATE public.services
SET name = 'Acompanhamento e Gestão Shopee',
    updated_at = now()
WHERE code = 'acompanhamento_shopee'
  AND name <> 'Acompanhamento e Gestão Shopee';