"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    if (searchParams?.get("registered") === "true") {
      toast({
        title: "Account created",
        description: "Please sign in to continue",
      });
    }
    // Only show config error toast once, and only if they came from a failed attempt (error in URL)
    const errorParam = searchParams?.get("error");
    if ((errorParam === "ServerError" || errorParam === "Configuration") && !hasShownErrorRef.current) {
      hasShownErrorRef.current = true;
      toast({
        title: "Sign-in issue",
        description: "Something went wrong on our side. Please try again. If it persists, check that NEXTAUTH_SECRET and NEXTAUTH_URL are set.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  const callbackUrl = searchParams?.get("callbackUrl");
  const needsAuth = !!callbackUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/dac94886-3075-4737-bdca-5cc6718aa40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'app/auth/signin/page.tsx:handleSubmit',message:'sign-in submit',data:{hasCallbackUrl:!!callbackUrl,hasEmail:!!formData.email,hasPassword:!!formData.password},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const timeoutMs = 25000; // 25s – avoid stuck "Signing in..." (e.g. cold DB)
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Sign-in is taking too long. The server may be waking up—please try again.")), timeoutMs)
    );

    try {
      // Normalize email: trim and lowercase (mobile keyboards often add spaces)
      const normalizedEmail = formData.email.trim().toLowerCase();
      const trimmedPassword = formData.password.trim();

      const result = await Promise.race([
        signIn("credentials", {
          email: normalizedEmail,
          password: trimmedPassword,
          redirect: false,
        }),
        timeoutPromise,
      ]);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/dac94886-3075-4737-bdca-5cc6718aa40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'app/auth/signin/page.tsx:afterSignIn',message:'sign-in result',data:{hasError:!!result?.error,ok:result?.ok,status:result?.status,hasUrl:!!result?.url},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      if (result?.error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/dac94886-3075-4737-bdca-5cc6718aa40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'app/auth/signin/page.tsx:resultError',message:'sign-in error branch',data:{error:result.error},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
          errorDetails = "We couldn't reach the database. If you use Neon: your project may be paused—open console.neon.tech, open your project to wake it, wait a few seconds, then try signing in again. You can also try clicking Sign in again in case the database was waking up.";
        } else if (result.error.includes("Configuration") || result.error.includes("ServerError")) {
          errorMessage = "Server configuration error.";
          errorDetails = "Something went wrong on our side. Please try again. If it persists, check that NEXTAUTH_SECRET and NEXTAUTH_URL are set.";
        } else if (result.error.includes("AccessDenied")) {
          errorMessage = "Access denied.";
          errorDetails = "Your account may be suspended or inactive. Please contact support.";
        } else {
          if (process.env.NODE_ENV === "development") {
            errorDetails = `Error: ${result.error}`;
          }
        }
        
        toast({
          title: errorMessage,
          description: errorDetails || "Please try again or contact support if the problem persists.",
          variant: "destructive",
          duration: 5000,
        });
        setLoading(false);
      } else {
        // Sign-in succeeded - redirect to dashboard (or callbackUrl if set)
        let path = callbackUrl || "/dashboard";
        try {
          if (path.startsWith("http")) {
            const u = new URL(path, window.location.origin);
            path = u.pathname + u.search;
          }
          // Avoid redirect loops - if path is signin, go to dashboard instead
          if (path.includes("/auth/signin") || path.includes("/auth/signup")) {
            path = "/dashboard";
          }
        } catch {
          path = "/dashboard";
        }
        // Full page load so the session cookie is sent with the request
        window.location.href = path;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Please try again. If the problem persists, contact support.";
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/dac94886-3075-4737-bdca-5cc6718aa40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'app/auth/signin/page.tsx:catch',message:'sign-in exception',data:{message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      toast({
        title: "Sign-in issue",
        description: message,
        variant: "destructive",
        duration: 5000,
      });
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
