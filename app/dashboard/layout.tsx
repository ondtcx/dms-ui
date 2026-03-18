"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, mainMenuItems } from "@/components/app-sidebar";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { SearchBar } from "@/components/search/SearchBar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Encontrar el título de la página actual
  const getCurrentPageTitle = () => {
    if (pathname.startsWith("/dashboard/search")) return "Resultados de búsqueda";
    for (const item of mainMenuItems) {
      if (pathname === item.url) {
        return item.title;
      }
      if (item.items) {
        for (const subItem of item.items) {
          if (pathname === subItem.url) {
            return subItem.title;
          }
        }
      }
    }
    return null;
  };

  const pageTitle = getCurrentPageTitle();

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
                {pageTitle && (
                  <h2 className="text-lg font-semibold">{pageTitle}</h2>
                )}
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
