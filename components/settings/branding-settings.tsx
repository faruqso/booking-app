"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, ArrowRight } from "lucide-react";
import { HelpTooltip } from "@/components/ui/help-tooltip";

export default function BrandingSettings() {
  const router = useRouter();

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>Branding</CardTitle>
          <HelpTooltip content="Customize your business branding, colors, logo, fonts, and visual identity that customers see on your booking page and emails." />
        </div>
        <CardDescription>
          Customize your business branding, colors, logo, and fonts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage your business branding settings including logo, colors, fonts, favicon, and subdomain. These settings affect how your business appears to customers.
          </p>
          <Button onClick={() => router.push("/dashboard/branding")} className="gap-2">
            Open Branding Settings
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
