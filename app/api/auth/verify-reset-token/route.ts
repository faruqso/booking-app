import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false });
    }

    // Find token in database
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ valid: false });
    }

    // Check if token is expired
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token },
      });
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Verify reset token error:", error);
    return NextResponse.json({ valid: false });
  }
}

