import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function authorized(request: Request) {
  const expected = Deno.env.get('RETAIL_BRIDGE_SHARED_SECRET') || '';
  const supplied = request.headers.get('x-retail-bridge-secret') || '';
  return expected.length >= 32 && supplied.length === expected.length && supplied === expected;
}

Deno.serve(async (request) => {
  if (!authorized(request)) {
    return response({ success: false, error: 'Unauthorized retail bridge request.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return response({ success: false, error: 'Wholesale bridge server configuration is incomplete.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    if (request.method === 'GET') {
      const { data, error } = await admin.rpc('retail_bridge_catalog');
      if (error) throw error;
      return response({ success: true, currency: 'LKR', products: data || [] });
    }

    if (request.method !== 'POST') {
      return response({ success: false, error: 'Method not allowed.' }, 405);
    }

    const payload = await request.json();
    if (payload?.action !== 'post_sale') {
      return response({ success: false, error: 'Unsupported bridge action.' }, 400);
    }
    if (!payload.idempotency_key || !payload.retail_sale_reference || !Array.isArray(payload.items) || !payload.items.length) {
      return response({
        success: false,
        error: 'idempotency_key, retail_sale_reference and at least one item are required.'
      }, 400);
    }

    const rpcArgs: Record<string, unknown> = {
      p_idempotency_key: String(payload.idempotency_key),
      p_retail_sale_reference: String(payload.retail_sale_reference),
      p_items: payload.items.map((item: Record<string, unknown>) => ({
        product_id: item.product_id,
        qty: item.qty
      }))
    };
    if (payload.sale_date) rpcArgs.p_sale_date = payload.sale_date;

    const { data, error } = await admin.rpc('retail_bridge_post_sale', rpcArgs);
    if (error) throw error;
    return response(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Retail bridge request failed.';
    return response({ success: false, error: message }, 400);
  }
});
