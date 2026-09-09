"use client";

import { Suspense } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { DashboardBreadcrumb } from "@/components/navigation/DashboardBreadcrumb";

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
