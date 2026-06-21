import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(req: Request, { params }: { params: { partnerId: string } }) {
  try {
    const partnerId = params.partnerId;

    if (!partnerId) {
      return NextResponse.json({ error: "Partner ID is required" }, { status: 400 });
    }

    const { data: payments, error } = await supabaseAdmin
      .from("payments")
      .select(`
        payment_id,
        amount,
        status,
        created_at,
        grievance_id,
        complaints ( title, category, location ),
        users ( name )
      `)
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching partner earnings:", error);
      return NextResponse.json({ error: "Failed to fetch partner earnings" }, { status: 500 });
    }

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Partner Earnings Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
