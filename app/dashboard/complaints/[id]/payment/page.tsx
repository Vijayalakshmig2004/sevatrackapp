"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { ArrowLeft, CheckCircle, CreditCard, Download, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function initPayment() {
      try {
        // Fetch complaint details
        const compRes = await fetch(`/api/complaints/${id}`);
        const compData = await compRes.json();
        if (compData.complaint) {
          setComplaint(compData.complaint);
        }

        // Initialize payment order
        const payRes = await fetch("/api/create-payment-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grievance_id: id }),
        });
        
        const payData = await payRes.json();
        if (payRes.ok) {
          setPaymentDetails(payData);
        } else if (payData.error === "Payment already completed for this grievance") {
          setSuccess(true);
        } else {
          setError(payData.error || "Failed to initialize payment");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    initPayment();
  }, [id]);

  const handlePayment = async () => {
    if (!paymentDetails) return;
    setProcessing(true);

    const isMock = paymentDetails.keyId === "rzp_test_placeholder";

    if (isMock) {
      try {
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: paymentDetails.orderId,
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(7)}`,
            razorpay_signature: "mock_signature",
          }),
        });
        
        if (verifyRes.ok) {
          setSuccess(true);
        } else {
          setError("Mock Payment verification failed.");
        }
      } catch (err) {
        setError("Error verifying mock payment.");
      } finally {
        setProcessing(false);
      }
      return;
    }

    const options = {
      key: paymentDetails.keyId,
      amount: paymentDetails.amount * 100,
      currency: paymentDetails.currency,
      name: "SevaTrack",
      description: `Payment for Grievance #${id}`,
      order_id: paymentDetails.orderId,
      handler: async function (response: any) {
        try {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          
          if (verifyRes.ok) {
            setSuccess(true);
          } else {
            setError("Payment verification failed.");
          }
        } catch (err) {
          setError("Error verifying payment.");
        } finally {
          setProcessing(false);
        }
      },
      prefill: {
        name: "Citizen",
        email: "citizen@example.com",
      },
      theme: {
        color: "#16a34a",
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      setError("Payment failed: " + response.error.description);
      setProcessing(false);
    });
    rzp.open();
  };

  const downloadReceipt = () => {
    const text = `
SEVATRACK PAYMENT RECEIPT
-------------------------
Grievance ID: ${id}
Amount Paid: ₹${paymentDetails?.amount || 0}
Status: PAID
Date: ${new Date().toLocaleString()}

Thank you for using SevaTrack!
    `.trim();
    
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt_${id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Calculating service charge...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 text-center py-8">
          <CardContent className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">Payment Successful!</h2>
            <p className="text-muted-foreground">Thank you. The service partner has been paid for resolving your issue.</p>
            
            <div className="pt-6 flex flex-col gap-3">
              <Button onClick={downloadReceipt} className="bg-primary">
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button variant="outline" onClick={() => router.push(`/dashboard/complaints/${id}`)}>
                Return to Complaint
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="max-w-xl mx-auto space-y-6">
        <Button variant="ghost" className="mb-2" onClick={() => router.push(`/dashboard/complaints/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Service Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grievance ID</span>
                <span className="font-medium">{id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{complaint?.category || "N/A"}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium text-right max-w-[200px] truncate" title={complaint?.location}>
                  {complaint?.location?.split('|')[0] || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Partner</span>
                <span className="font-medium">{complaint?.servicePartner?.name || "N/A"}</span>
              </div>
            </div>

            <Separator />

            {paymentDetails?.breakdown && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Charge</span>
                  <span>₹{paymentDetails.breakdown.basePrice}</span>
                </div>
                {paymentDetails.breakdown.distanceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance Charge</span>
                    <span>₹{paymentDetails.breakdown.distanceCharge}</span>
                  </div>
                )}
                {paymentDetails.breakdown.urgencyCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urgency Charge</span>
                    <span>₹{paymentDetails.breakdown.urgencyCharge}</span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-primary">₹{paymentDetails?.amount || 0}</span>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white" 
              onClick={handlePayment}
              disabled={processing || !paymentDetails}
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${paymentDetails?.amount || 0} Securely`
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <span>Secured by</span>
          <span className="font-bold text-[#0d2366]">Razorpay</span>
        </div>
      </div>
    </>
  );
}
