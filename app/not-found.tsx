import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Calendar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center">
                  <div className="h-24 w-24 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-primary/40" />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-6xl font-bold text-primary/30 mb-2">404</div>
              <CardTitle className="text-3xl font-bold">Page Not Found</CardTitle>
              <CardDescription className="text-base">
                Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-muted-foreground">
              <p>
                Don&apos;t worry, let&apos;s get you back on track. Here are some helpful links:
              </p>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="default" size="lg" className="w-full">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center mb-4 font-medium">
                Popular pages:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/bookings">Bookings</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/services">Services</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/customers">Customers</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/settings">Settings</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please check the URL or return to the{" "}
            <Button asChild variant="link" className="p-0 h-auto font-normal">
              <Link href="/dashboard" className="underline">
                dashboard
              </Link>
            </Button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
