"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Settings,
  Clock,
  LogOut,
  User,
  Sparkles,
  SlidersHorizontal,
  Users,
  UserCog,
  MapPin,
  Repeat,
  CreditCard,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Scissors,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Core navigation items (always visible)
const coreNavigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Services", href: "/dashboard/services", icon: Scissors },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
];

// Management section
const managementNavigation = [
  { name: "Recurring", href: "/dashboard/recurring-bookings", icon: Repeat },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Locations", href: "/dashboard/locations", icon: MapPin },
  { name: "Availability", href: "/dashboard/availability", icon: Clock },
];

// Configuration section
const configurationNavigation = [
  { name: "Staff", href: "/dashboard/staff", icon: UserCog, ownerOnly: true },
  { name: "Branding", href: "/dashboard/branding", icon: Sparkles },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard, ownerOnly: true },
  { name: "Settings", href: "/dashboard/settings", icon: SlidersHorizontal },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [bookingUrl, setBookingUrl] = useState("");
  const [copied, setCopied] = useState(false);
  
  const businessId = session?.user?.businessId;

  useEffect(() => {
    if (businessId && typeof window !== "undefined") {
      setBookingUrl(`${window.location.origin}/book/${businessId}`);
    }
  }, [businessId]);

  const copyBookingUrl = async () => {
    if (bookingUrl) {
      try {
        await navigator.clipboard.writeText(bookingUrl);
        setCopied(true);
        toast({
          title: "Copied!",
          description: "Booking page URL copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy URL",
          variant: "destructive",
        });
      }
    }
  };
  
  // Check if any item in each section is active to auto-open (memoized for performance)
  const hasActiveManagement = useMemo(() => {
    return managementNavigation.some(
      (item) => {
        if (item.ownerOnly && session?.user?.role !== "BUSINESS_OWNER") return false;
        return pathname === item.href || 
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
      }
    );
  }, [pathname, session?.user?.role]);
  
  const hasActiveConfiguration = useMemo(() => {
    return configurationNavigation.some(
      (item) => {
        if (item.ownerOnly && session?.user?.role !== "BUSINESS_OWNER") return false;
        return pathname === item.href || 
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));
      }
    );
  }, [pathname, session?.user?.role]);

  const [managementOpen, setManagementOpen] = useState(hasActiveManagement);
  const [configurationOpen, setConfigurationOpen] = useState(hasActiveConfiguration);

  // Auto-open sections when navigating to items within them
  useEffect(() => {
    if (hasActiveManagement && !managementOpen) {
      setManagementOpen(true);
    }
    if (hasActiveConfiguration && !configurationOpen) {
      setConfigurationOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Only depend on pathname to avoid unnecessary re-renders

  const renderNavItem = (item: typeof coreNavigation[0], isNested = false) => {
    const isActive = pathname === item.href || 
      (item.href !== "/dashboard" && pathname?.startsWith(item.href));
    const Icon = item.icon;
    
    const content = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
          collapsed ? "px-3 justify-center w-full" : "px-3 w-full",
          isNested && !collapsed && "ml-2",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
        {!collapsed && <span className="truncate flex-1 min-w-0">{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.name} delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                {content}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <div key={item.name}>{content}</div>;
  };

  const renderNavSection = (
    items: typeof managementNavigation,
    isOpen: boolean,
    onToggle: () => void,
    title: string
  ) => {
    // Filter items based on permissions
    const filteredItems = items.filter((item) => {
      if (item.ownerOnly && session?.user?.role !== "BUSINESS_OWNER") {
        return false;
      }
      return true;
    });

    if (filteredItems.length === 0) return null;

    // Check if any item in section is active
    const hasActiveItem = filteredItems.some(
      (item) => pathname === item.href || 
        (item.href !== "/dashboard" && pathname?.startsWith(item.href))
    );

    // Auto-open if active item is in this section
    const shouldBeOpen = isOpen || hasActiveItem;

    if (collapsed) {
      return (
        <div className="space-y-1">
          {filteredItems.map((item) => renderNavItem(item, true))}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{title}</span>
          <ChevronRight className={cn(
            "h-3 w-3 transition-transform duration-200",
            shouldBeOpen && "rotate-90"
          )} />
        </button>
        {shouldBeOpen && (
          <div className="space-y-1">
            {filteredItems.map((item) => renderNavItem(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn(
        "group flex h-screen flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Logo/Brand */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed ? (
            <>
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold">Dashboard</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCollapsed(!collapsed)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 overflow-hidden bg-primary text-primary-foreground group-hover:bg-background group-hover:text-foreground group-hover:border group-hover:border-border"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 group-hover:scale-0 group-hover:opacity-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                <PanelLeftOpen className="h-5 w-5" />
              </div>
            </button>
          )}
        </div>

        {/* Quick Action: Copy Booking Link */}
        {businessId && (
          <div className="border-b px-3 py-3">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyBookingUrl}
                    className="w-full h-9 justify-center p-0"
                    aria-label="Copy booking link"
                    title="Copy booking link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Copy Booking Link</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={copyBookingUrl}
                className="w-full h-9 gap-2 text-xs font-medium"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    <span>Copy Booking Link</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav 
          className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
        >
          {/* Core Navigation - Always visible */}
          <div className="space-y-1">
            {coreNavigation.map((item) => renderNavItem(item))}
          </div>

          {!collapsed && (
            <>
              {/* Management Section */}
              {renderNavSection(
                managementNavigation,
                managementOpen,
                () => setManagementOpen(!managementOpen),
                "Management"
              )}

              {/* Configuration Section */}
              {renderNavSection(
                configurationNavigation,
                configurationOpen,
                () => setConfigurationOpen(!configurationOpen),
                "Configuration"
              )}
            </>
          )}

          {collapsed && (
            <>
              {/* Management items when collapsed */}
              <div className="space-y-1">
                {managementNavigation
                  .filter((item) => {
                    if (item.ownerOnly && session?.user?.role !== "BUSINESS_OWNER") return false;
                    return true;
                  })
                  .map((item) => renderNavItem(item, true))}
              </div>

              {/* Configuration items when collapsed */}
              <div className="space-y-1">
                {configurationNavigation
                  .filter((item) => {
                    if (item.ownerOnly && session?.user?.role !== "BUSINESS_OWNER") return false;
                    return true;
                  })
                  .map((item) => renderNavItem(item, true))}
              </div>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t p-4">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-center p-0"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {session?.user?.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{session?.user?.name || "User"}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {session?.user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col items-start text-sm">
                    <span className="font-medium">
                      {session?.user?.name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {session?.user?.email}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
