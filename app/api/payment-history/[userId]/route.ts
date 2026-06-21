import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { data: payments, error } = await supabaseAdmin
      .from("payments")
      .select(`
        payment_id,
        amount,
        status,
        created_at,
        grievance_id,
        complaints ( title, category )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payment history:", error);
      return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
    }

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Payment History Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
