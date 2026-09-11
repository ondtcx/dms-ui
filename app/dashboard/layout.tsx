"use client";

import { Suspense } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { DashboardBreadcrumb } from "@/components/navigation/DashboardBreadcrumb";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

function DashboardProfile() {
  const { user, logout } = useAuth();
  const userName = user?.name?.trim() || "Usuario";
  const userRole = user?.role?.toUpperCase() || "USUARIO";
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase() || "US";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menú de cuenta"
          className="flex min-w-0 items-center gap-2 rounded-md p-1.5 text-left outline-hidden transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-institution-primary-foreground"
        >
          <Avatar className="size-9 shrink-0">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-medium">{userName}</span>
            <span className="block truncate text-xs text-institution-primary-foreground/75">{userRole}</span>
          </span>
          <ChevronDown aria-hidden="true" className="hidden size-4 shrink-0 sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>
          <div>{userName}</div>
          <div className="text-xs font-normal text-muted-foreground">{userRole}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Suspense fallback={null}>
          <AppSidebar />
        </Suspense>

        {/* Main Content with Header */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header aria-label="Encabezado principal" className="sticky top-0 z-40 border-b bg-background">
            <div className="flex h-16 min-w-0 items-center justify-between px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <SidebarTrigger />
                <div className="min-w-0 truncate"><DashboardBreadcrumb /></div>
              </div>
              <div className="mx-2 min-w-0 max-w-md flex-1 sm:mx-6">
                <SearchBar />
              </div>
              <div className="ml-auto shrink-0">
                <DashboardProfile />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <SidebarInset>
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
