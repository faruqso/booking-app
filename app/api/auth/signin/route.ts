import { NextResponse } from "next/server";
import { signIn } from "next-auth/react";

// This route is not needed since we use next-auth's signIn function on the client
// But we can keep it for API compatibility if needed
export async function POST(request: Request) {
  return NextResponse.json(
    { error: "Use next-auth signIn function on the client" },
    { status: 405 }
  );
}

