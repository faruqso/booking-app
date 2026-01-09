import { prisma } from "@/lib/prisma";

export interface Branding {
  businessName: string;
  primaryColor: string;
  logoUrl?: string | null;
}

export async function getBusinessBranding(businessId: string): Promise<Branding | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      businessName: true,
      primaryColor: true,
      logoUrl: true,
    },
  });

  if (!business) return null;

  return {
    businessName: business.businessName,
    primaryColor: business.primaryColor,
    logoUrl: business.logoUrl,
  };
}

export function applyBrandingStyles(branding: Branding): string {
  return `
    :root {
      --brand-primary: ${branding.primaryColor};
    }
  `;
}

