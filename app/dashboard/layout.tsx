"use client";

import Link from "next/link";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardBreadcrumb } from "@/components/navigation/DashboardBreadcrumb";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        {/* Main Content with Header */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b bg-background sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <DashboardBreadcrumb />
              </div>
              <div className="flex-1 mx-6 flex justify-center">
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/dashboard/documents">
                    <Search className="h-4 w-4" />
                    Buscar en documentos
                  </Link>
                </Button>
              </div>
              <div className="w-10" />
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
