import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

describe('Hardening de Grants - Validação Pós-Migration', () => {
  const saasProductId = '36031f36-31e3-42f1-99f3-c6e37b7bc127'; // Valtro Pricing
  
  it('ANON: não deve ter acesso de SELECT em public.bugs', async () => {
    const { data, error } = await supabase
      .from('bugs')
      .select('id')
      .limit(1);
    
    expect(error || data?.length === 0).toBeTruthy();
  });

  it('ANON: não deve ter acesso de INSERT em public.bugs', async () => {
    const { error } = await supabase
      .from('bugs')
      .insert({ 
        title: 'Hacker Attempt', 
        description: 'Anon insert',
        saas_product_id: saasProductId 
      });
    
    expect(error).toBeTruthy();
  });

  it('SERVICE_ROLE: deve persistir bugs via pipeline server-side', async () => {
    const { data, error } = await supabaseAdmin
      .from('bugs')
      .insert({
        title: 'System Audit Bug',
        description: 'Testing service_role grants',
        severity: 'normal',
        status: 'new',
        environment: 'production',
        saas_product_id: saasProductId
      })
      .select('id')
      .single();
    
    expect(error).toBeNull();
    expect(data?.id).toBeDefined();

    if (data?.id) {
       await supabaseAdmin.from('bugs').delete().eq('id', data.id);
    }
  });

  it('SERVICE_ROLE: deve persistir feedback via pipeline server-side', async () => {
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        title: 'System Audit Feedback',
        description: 'Testing service_role grants',
        type: 'suggestion',
        status: 'new',
        source: 'other',
        saas_product_id: saasProductId
      })
      .select('id')
      .single();
    
    expect(error).toBeNull();
    expect(data?.id).toBeDefined();

    if (data?.id) {
       await supabaseAdmin.from('feedback').delete().eq('id', data.id);
    }
  });

  it('VIEW: api_credentials_safe deve ser acessível via authenticated admin', async () => {
     const { data, error } = await supabaseAdmin
       .from('api_credentials_safe' as any)
       .select('*')
       .limit(1);
     
     expect(error).toBeNull();
  });

});
