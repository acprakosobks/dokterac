import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      customer_name,
      customer_whatsapp,
      customer_email,
      customer_address_detail,
      customer_latitude,
      customer_longitude,
      booking_date,
      booking_time,
      notes,
      selected_service_ids,
    } = body;

    if (!customer_name || !customer_whatsapp || !customer_latitude || !customer_longitude || !booking_date || !booking_time) {
      return new Response(JSON.stringify({ error: "Data wajib tidak lengkap." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!selected_service_ids || selected_service_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Pilih minimal satu layanan." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find nearest active vendor
    const { data: vendors, error: vendorErr } = await supabase
      .from("vendors")
      .select("id, company_name, latitude, longitude")
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (vendorErr) throw vendorErr;
    if (!vendors || vendors.length === 0) {
      return new Response(JSON.stringify({ error: "Tidak ada vendor aktif tersedia." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const withDistance = vendors
      .map((v) => ({
        ...v,
        distance: haversineDistance(customer_latitude, customer_longitude, v.latitude!, v.longitude!),
      }))
      .sort((a, b) => a.distance - b.distance);

    const nearest = withDistance[0];

    // 2. Fetch vendor_services belonging to nearest vendor that match selected IDs
    const { data: svcData, error: svcErr } = await supabase
      .from("vendor_services")
      .select("id, price, master_services(service_name)")
      .eq("vendor_id", nearest.id)
      .eq("is_active", true)
      .in("id", selected_service_ids);

    if (svcErr) throw svcErr;

    const selectedServices = (svcData || []).map((s: any) => ({
      id: s.id,
      name: s.master_services?.service_name || "Layanan",
      price: Number(s.price),
    }));

    // 3. Insert booking
    const { data: booking, error: bookErr } = await supabase.from("bookings").insert({
      vendor_id: nearest.id,
      customer_name,
      customer_whatsapp,
      customer_email: customer_email || null,
      customer_address_detail: customer_address_detail || null,
      customer_latitude,
      customer_longitude,
      booking_date,
      booking_time,
      notes: notes || null,
      selected_services: selectedServices,
    }).select("id").single();

    if (bookErr) throw bookErr;

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: booking.id,
        vendor_name: nearest.company_name,
        vendor_distance_km: Math.round(nearest.distance * 10) / 10,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
