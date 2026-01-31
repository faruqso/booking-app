"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { ComponentType } from "react";
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

type NavItem = { name: string; href: string; icon: ComponentType<{ className?: string }>; ownerOnly?: boolean };

// Core navigation items (always visible)
const coreNavigation: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Services", href: "/dashboard/services", icon: Scissors },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
];

// Management section
const managementNavigation: NavItem[] = [
  { name: "Recurring", href: "/dashboard/recurring-bookings", icon: Repeat },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Locations", href: "/dashboard/locations", icon: MapPin },
  { name: "Availability", href: "/dashboard/availability", icon: Clock },
];

// Configuration section
const configurationNavigation: NavItem[] = [
  { name: "Staff", href: "/dashboard/staff", icon: UserCog, ownerOnly: true },
  { name: "Branding", href: "/dashboard/branding", icon: Sparkles },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard, ownerOnly: true },
  { name: "Settings", href: "/dashboard/settings", icon: SlidersHorizontal },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
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

  // Prefetch dashboard routes so tab clicks feel instant
  useEffect(() => {
    const hrefs = [
      ...coreNavigation.map((i) => i.href),
      ...managementNavigation.map((i) => i.href),
      ...configurationNavigation
        .filter((i) => !i.ownerOnly || session?.user?.role === "BUSINESS_OWNER")
        .map((i) => i.href),
    ];
    hrefs.forEach((href) => router.prefetch(href));
  }, [router, session?.user?.role]);

  const renderNavItem = (item: typeof coreNavigation[0], isNested = false) => {
    const isActive = pathname === item.href || 
      (item.href !== "/dashboard" && pathname?.startsWith(item.href));
    const Icon = item.icon;
    
    return (
      <div key={item.name} title={collapsed ? item.name : undefined} className="w-full">
        <Link
          href={item.href}
          prefetch={true}
          className={cn(
            "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-300 ease-in-out min-w-0",
            collapsed ? "px-3 justify-center w-full" : "px-3 w-full",
            isNested && !collapsed && "ml-2",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className={cn("h-5 w-5 flex-shrink-0 transition-all duration-300", collapsed && "mx-auto")} />
          <span
            className={cn(
              "truncate min-w-0 transition-all duration-300 ease-in-out",
              collapsed ? "opacity-0 max-w-0 overflow-hidden w-0" : "flex-1"
            )}
          >
            {item.name}
          </span>
        </Link>
      </div>
    );
  };

  const renderNavSection = (
    items: typeof managementNavigation,
    isOpen: boolean,
    onToggle: () => void,
    title: string
  ) => {
    const filteredItems = items.filter((item) => {
      if (item.ownerOnly && session?.user?.role !== "BUSINESS_OWNER") return false;
      return true;
    });
    if (filteredItems.length === 0) return null;

    const hasActiveItem = filteredItems.some(
      (item) => pathname === item.href || 
        (item.href !== "/dashboard" && pathname?.startsWith(item.href))
    );
    const shouldBeOpen = isOpen || hasActiveItem;

    return (
      <div className="space-y-1">
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-in-out overflow-hidden max-h-8",
            "text-muted-foreground hover:text-foreground",
            collapsed && "max-h-0 opacity-0 py-0 px-0 border-0 pointer-events-none my-0"
          )}
        >
          <span>{title}</span>
          <ChevronRight className={cn(
            "h-3 w-3 transition-transform duration-300",
            shouldBeOpen && "rotate-90"
          )} />
        </button>
        <div className={cn(
          "space-y-1 transition-all duration-300 ease-in-out overflow-hidden",
          !collapsed && !shouldBeOpen && "max-h-0 opacity-0"
        )}>
          {filteredItems.map((item) => renderNavItem(item, true))}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn(
        "group flex h-screen flex-col border-r bg-background overflow-hidden transition-[width] duration-300 ease-in-out flex-shrink-0",
        collapsed ? "w-16 min-w-[4rem]" : "w-64 min-w-[16rem]"
      )}>
        {/* Logo/Brand - single DOM, crossfade */}
        <div className="flex h-16 flex-shrink-0 items-center border-b px-4 min-w-0">
          <div className="relative flex flex-1 items-center min-w-0 min-w-8 h-8">
            {/* Expanded: logo + text + collapse btn */}
            <div
              className={cn(
                "flex items-center justify-between w-full min-w-0 transition-opacity duration-300 ease-in-out",
                collapsed && "absolute inset-0 opacity-0 pointer-events-none"
              )}
            >
              <Link href="/dashboard" className="flex items-center space-x-2 min-w-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold truncate">Dashboard</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => setCollapsed(true)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            {/* Collapsed: centered expand button */}
            <button
              onClick={() => setCollapsed(false)}
              className={cn(
                "absolute inset-0 mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ease-in-out hover:scale-105 overflow-hidden bg-primary text-primary-foreground group-hover:bg-background group-hover:text-foreground group-hover:border group-hover:border-border",
                !collapsed && "opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
              )}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <span className="flex items-center justify-center w-full h-full group-hover:[&_.icon-expand]:opacity-0 group-hover:[&_.icon-expand]:scale-0 [&_.icon-expand]:transition-all [&_.icon-expand]:duration-200">
                <Calendar className="h-5 w-5 icon-expand" />
              </span>
              <span className="absolute inset-0 flex items-center justify-center scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200">
                <PanelLeftOpen className="h-5 w-5" />
              </span>
            </button>
          </div>
        </div>

        {/* Quick Action: Copy Booking Link - single DOM */}
        {businessId && (
          <div className="border-b px-3 py-3 overflow-hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={copyBookingUrl}
              title={collapsed ? "Copy booking link" : undefined}
              aria-label="Copy booking link"
              className={cn(
                "w-full h-9 gap-2 text-xs font-medium transition-all duration-300 ease-in-out overflow-hidden",
                collapsed && "justify-center"
              )}
            >
              {copied ? (
                <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
              ) : (
                <Link2 className="h-4 w-4 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "truncate whitespace-nowrap transition-all duration-300 ease-in-out",
                  copied && "text-green-600",
                  collapsed && "opacity-0 max-w-0 overflow-hidden w-0"
                )}
              >
                {copied ? "Copied!" : "Copy Booking Link"}
              </span>
            </Button>
          </div>
        )}

        {/* Navigation - single DOM, sections always rendered */}
        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden pl-3 pr-5 py-4">
          <div className="space-y-1">
            {coreNavigation.map((item) => renderNavItem(item))}
          </div>

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
        </nav>

        {/* User Section - single DOM */}
        <div className="border-t p-4 overflow-hidden flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                title={collapsed ? (session?.user?.name || "User") : undefined}
                className={cn(
                  "w-full gap-3 transition-all duration-300 ease-in-out overflow-hidden",
                  collapsed ? "justify-center px-0" : "justify-start px-3"
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    {session?.user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "flex flex-1 flex-col items-start text-sm min-w-0 transition-all duration-300 ease-in-out",
                    collapsed && "opacity-0 max-w-0 overflow-hidden w-0"
                  )}
                >
                  <span className="font-medium truncate">
                    {session?.user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
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
        </div>
      </div>
    </TooltipProvider>
  );
}
