import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const { grievance_id } = await req.json();

    if (!grievance_id) {
      return NextResponse.json({ error: "Grievance ID is required" }, { status: 400 });
    }

    // Fetch grievance details
    const { data: grievance, error: grievanceError } = await supabaseAdmin
      .from("complaints")
      .select("*")
      .eq("id", grievance_id)
      .single();

    if (grievanceError || !grievance) {
      return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
    }

    // Check if a payment already exists
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("grievance_id", grievance_id)
      .single();

    if (existingPayment && existingPayment.status === "PAID") {
      return NextResponse.json({ error: "Payment already completed for this grievance" }, { status: 400 });
    }

    // Default Pricing Table logic in case DB is empty
    const pricingLogic: Record<string, any> = {
      "Road Issue": { base: 100 },
      "Street Light Issue": { base: 80 },
      "Water Problem": { base: 150 },
      "Garbage Issue": { base: 70 },
      "Other": { base: 50 }
    };

    let basePrice = 50; // default for minor
    
    // Attempt to fetch from pricing table
    const { data: pricingData } = await supabaseAdmin
      .from("pricing")
      .select("*")
      .eq("category", grievance.category)
      .single();

    if (pricingData) {
      basePrice = Number(pricingData.base_price);
    } else {
      // fallback
      const catKey = Object.keys(pricingLogic).find(k => grievance.category.toLowerCase().includes(k.toLowerCase()));
      if (catKey) basePrice = pricingLogic[catKey].base;
    }

    // Mock distance based on length of location string for demo
    // 0-5km = +0, 5-10km = +30, >10km = +50
    const locationLength = grievance.location ? grievance.location.length : 0;
    let distanceCharge = 0;
    if (locationLength > 20) distanceCharge = 50; // mocking >10km
    else if (locationLength > 10) distanceCharge = 30; // mocking 5-10km

    // Urgency charge
    let urgencyCharge = 0;
    if (grievance.urgency && grievance.urgency.toLowerCase() === "emergency") {
      urgencyCharge = 100;
    }

    const totalAmount = basePrice + distanceCharge + urgencyCharge;

    // Create Razorpay order
    let orderId = "";
    const isMock = (process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder") === "rzp_test_placeholder";
    
    if (isMock) {
      orderId = `order_mock_${crypto.randomUUID().substring(0, 8)}`;
    } else {
      const options = {
        amount: totalAmount * 100, // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_order_${grievance_id.substring(0, 8)}`,
      };
      const order = await razorpay.orders.create(options);
      orderId = order.id;
    }

    // If there was an existing PENDING payment, update it, otherwise insert new
    let paymentRecord;
    
    // For service partner extraction
    let partnerId = null;
    if (grievance.service_partner && typeof grievance.service_partner === 'object' && grievance.service_partner.id) {
      partnerId = grievance.service_partner.id;
    }

    if (existingPayment) {
      const { data, error } = await supabaseAdmin
        .from("payments")
        .update({
          amount: totalAmount,
          razorpay_order_id: orderId,
          partner_id: partnerId
        })
        .eq("payment_id", existingPayment.payment_id)
        .select()
        .single();
      paymentRecord = data;
    } else {
      const paymentId = crypto.randomUUID();
      const { data, error } = await supabaseAdmin
        .from("payments")
        .insert({
          payment_id: paymentId,
          grievance_id: grievance_id,
          user_id: grievance.user_id,
          partner_id: partnerId,
          amount: totalAmount,
          razorpay_order_id: orderId,
          status: "PENDING"
        })
        .select()
        .single();
      paymentRecord = data;
    }

    return NextResponse.json({
      orderId: orderId,
      amount: totalAmount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
      breakdown: {
        basePrice,
        distanceCharge,
        urgencyCharge
      }
    });

  } catch (error) {
    console.error("Payment Order Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
