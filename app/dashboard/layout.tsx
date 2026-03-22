"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
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
              <div className="flex-1 max-w-md mx-6">
                <SearchBar />
              </div>
              <div className="flex items-center gap-2">
                <NotificationsDropdown />
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
