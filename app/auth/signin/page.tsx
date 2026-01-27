"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (searchParams?.get("registered") === "true") {
      toast({
        title: "Account created",
        description: "Please sign in to continue",
      });
    }
  }, [searchParams, toast]);

  const callbackUrl = searchParams?.get("callbackUrl");
  const needsAuth = !!callbackUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Normalize email: trim and lowercase (mobile keyboards often add spaces)
      const normalizedEmail = formData.email.trim().toLowerCase();
      const trimmedPassword = formData.password.trim();

      console.log("[SIGNIN] Attempting sign in for:", normalizedEmail);
      
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password: trimmedPassword,
        redirect: false,
      });

      if (result?.error) {
        // Enhanced error logging
        console.error("[SIGNIN] Sign in error:", {
          error: result.error,
          email: normalizedEmail,
          timestamp: new Date().toISOString(),
          url: result.url,
        });
        
        let errorMessage = "Unable to sign in. Please try again.";
        let errorDetails = "";
        
        // Map specific error types to user-friendly messages
        if (result.error === "CredentialsSignin") {
          errorMessage = "Invalid email or password.";
          errorDetails = "Please check your credentials and try again. Make sure your email and password are correct.";
        } else if (result.error.includes("USER_NOT_FOUND")) {
          errorMessage = "Account not found.";
          errorDetails = `No account exists with the email "${normalizedEmail}". Please check your email or create a new account.`;
        } else if (result.error.includes("INVALID_PASSWORD")) {
          errorMessage = "Incorrect password.";
          errorDetails = "The password you entered is incorrect. Please try again or reset your password.";
        } else if (result.error.includes("NO_PASSWORD_SET")) {
          errorMessage = "Account setup incomplete.";
          errorDetails = "This account doesn't have a password set. Please reset your password or contact support.";
        } else if (result.error.includes("EMAIL_OR_PASSWORD_MISSING")) {
          errorMessage = "Missing information.";
          errorDetails = "Please enter both your email and password.";
        } else if (result.error.includes("DATABASE_CONNECTION_ERROR") || result.error.includes("DATABASE_ERROR")) {
          errorMessage = "Database connection error.";
          errorDetails = "Unable to connect to the database. This may be a temporary issue. Please try again in a moment. If the problem persists, contact support.";
        } else if (result.error.includes("Configuration")) {
          errorMessage = "Server configuration error.";
          errorDetails = "There's an issue with the server configuration. Please contact support if this persists.";
        } else if (result.error.includes("AccessDenied")) {
          errorMessage = "Access denied.";
          errorDetails = "Your account may be suspended or inactive. Please contact support.";
        } else {
          // Show the actual error in development
          if (process.env.NODE_ENV === "development") {
            errorDetails = `Error: ${result.error}`;
          }
        }
        
        // Log to console for debugging (always, not just in dev)
        console.error("[SIGNIN] Full error details:", {
          error: result.error,
          email: normalizedEmail,
          timestamp: new Date().toISOString(),
        });
        
        toast({
          title: errorMessage,
          description: errorDetails || "Please try again or contact support if the problem persists.",
          variant: "destructive",
          duration: 5000,
        });
      } else {
        toast({
          title: "Success",
          description: "Signed in successfully",
        });
        // Redirect to callback URL if provided, otherwise go to dashboard
        const redirectTo = callbackUrl || "/dashboard";
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      // Enhanced exception logging
      console.error("[SIGNIN] Sign in exception:", {
        error: err?.message,
        stack: err?.stack,
        name: err?.name,
        email: formData.email,
        timestamp: new Date().toISOString(),
      });
      
      let errorMessage = "An unexpected error occurred.";
      let errorDetails = "Please try again. If the problem persists, contact support.";
      
      if (err?.message) {
        errorDetails = `Error: ${err.message}`;
      }
      
      if (process.env.NODE_ENV === "development") {
        errorDetails += `\n\nTechnical details: ${err?.stack || JSON.stringify(err)}`;
      }
      
      toast({
        title: errorMessage,
        description: errorDetails,
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                <LogIn className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              {needsAuth 
                ? "Please sign in to access your dashboard"
                : "Sign in to your business account"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {needsAuth && (
              <Alert className="mb-4 border-primary/20 bg-primary/5">
                <AlertDescription className="text-sm">
                  You need to sign in to access <span className="font-semibold">{callbackUrl}</span>
                </AlertDescription>
              </Alert>
            )}
            {/* Debug info in development */}
            {process.env.NODE_ENV === "development" && (
              <Alert className="mb-4 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <AlertDescription className="text-xs">
                  <strong>Debug Mode:</strong> Check the browser console and server logs for detailed error information.
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="email"
                    required
                    placeholder="you@example.com"
                    className="pl-9 h-11"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                  placeholder="Enter your password"
                  className="h-11"
                  showIcon={true}
                  iconPosition="left"
                  IconComponent={Lock}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm">
              <div>
                <Link
                  href="/auth/forgot-password"
                  className="font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">Don&apos;t have an account? </span>
                <Link
                  href="/auth/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Create account
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
