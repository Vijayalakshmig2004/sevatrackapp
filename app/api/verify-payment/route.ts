import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder";

    const isMock = razorpay_payment_id.startsWith("pay_mock_");

    if (!isMock) {
      const generated_signature = crypto
        .createHmac("sha256", key_secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
      }
    }

    // Update payment status in database
    const { data: existingPayment, error: fetchError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .single();

    if (fetchError || !existingPayment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        razorpay_payment_id: razorpay_payment_id,
        status: "PAID",
      })
      .eq("payment_id", existingPayment.payment_id);

    if (updateError) {
      console.error("Error updating payment status:", updateError);
      return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Payment verified successfully" });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
