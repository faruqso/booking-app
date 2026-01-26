"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export default function BusinessInfoSettings() {
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Business Information</CardTitle>
        </div>
        <CardDescription>
          Manage your business profile and contact information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Business information settings coming soon. This will include business name, address, contact details, and more.
        </p>
      </CardContent>
    </Card>
  );
}
