"use client";

import { useEffect, useState } from "react";
import { CreditCard, Users, Database, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabaseClient } from "@/lib/supabase-client";

export default function AdminPaymentsDashboard() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllPayments() {
      try {
        const { data, error } = await supabaseClient
          .from("payments")
          .select(\`
            payment_id,
            amount,
            status,
            created_at,
            grievance_id,
            complaints ( title, category ),
            users ( name ),
            service_partners ( name )
          \`)
          .order("created_at", { ascending: false });

        if (data) {
          setPayments(data);
        }
      } catch (err) {
        console.error("Failed to fetch all payments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAllPayments();
  }, []);

  const totalRevenue = payments
    .filter((p) => p.status === "PAID")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingAmount = payments
    .filter((p) => p.status === "PENDING")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading admin payments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Payment Overview</h1>
        <p className="text-muted-foreground">Monitor all transactions and manage pricing settings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Paid)</CardTitle>
            <CreditCard className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalRevenue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">₹{pendingAmount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Database className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Partners</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(payments.map(p => p.service_partners?.name).filter(Boolean)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Date</th>
                  <th className="px-4 py-3">Grievance</th>
                  <th className="px-4 py-3">Citizen</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.payment_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">
                        {payment.complaints?.title || \`#\${payment.grievance_id.substring(0,8)}\`}
                      </td>
                      <td className="px-4 py-3">{payment.users?.name || "Unknown"}</td>
                      <td className="px-4 py-3">{payment.service_partners?.name || "Unassigned"}</td>
                      <td className="px-4 py-3 font-bold">₹{payment.amount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={payment.status === "PAID" ? "default" : "outline"} className={payment.status === "PAID" ? "bg-green-100 text-green-800" : ""}>
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
