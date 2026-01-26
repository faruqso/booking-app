"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function PaymentSettings() {
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>Payment Settings</CardTitle>
        </div>
        <CardDescription>
          Configure payment providers and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Payment settings coming soon. This will include Stripe, Paystack, Flutterwave configuration and payment preferences.
        </p>
      </CardContent>
    </Card>
  );
}
