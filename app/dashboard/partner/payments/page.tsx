"use client";

import { useEffect, useState } from "react";
import { CreditCard, IndianRupee, PieChart, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mocking logged-in partner ID for demo purposes.
// In a real app, this would come from Auth Context.
const DEMO_PARTNER_ID = "partner-1";

export default function PartnerPaymentsDashboard() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const res = await fetch(`/api/partner-earnings/${DEMO_PARTNER_ID}`);
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments || []);
        }
      } catch (err) {
        console.error("Failed to fetch payments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  const totalEarnings = payments
    .filter((p) => p.status === "PAID")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingPayments = payments
    .filter((p) => p.status === "PENDING")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const completedCount = payments.filter((p) => p.status === "PAID").length;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading payments dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments & Earnings</h1>
        <p className="text-muted-foreground">Manage your completed grievances and view earnings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalEarnings}</div>
            <p className="text-xs text-muted-foreground">From {completedCount} completed jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">₹{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">Awaiting user payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{payments.length}</div>
            <p className="text-xs text-muted-foreground">Total assigned tasks</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No payment records found.</p>
            ) : (
              payments.map((payment) => (
                <div key={payment.payment_id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-foreground">
                      {payment.complaints?.title || `Grievance #${payment.grievance_id.substring(0,8)}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      User: {payment.users?.name || "Unknown"} • {payment.complaints?.category || "Category"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{payment.amount}</p>
                    <Badge variant={payment.status === "PAID" ? "default" : "outline"} className={payment.status === "PAID" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
