import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Tag, Users, Settings, LogOut, Menu, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAdminStore } from "@/stores/adminStore";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
];

const mainAdminItems = [
  { label: "Admin Management", href: "/admin/admins", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminLayout() {
  const { admin, logout } = useAdminStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allItems = admin?.role === 'main_admin'
    ? [...navItems, ...mainAdminItems]
    : navItems;

  const currentPage = allItems.find((item) =>
    item.href === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(item.href)
  )?.label || "Admin";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-border/20">
        <Link to="/admin" className="font-heading text-xl font-bold text-primary">
          Elara
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5 font-body">Admin Panel</p>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-3">
        {allItems.map((item) => {
          const isActive = item.href === "/admin"
            ? location.pathname === "/admin"
            : location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors font-body",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary font-body">
            {admin?.name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate font-body">{admin?.name}</p>
            <Badge variant="secondary" className="text-[10px]">
              {admin?.role === 'main_admin' ? 'Main Admin' : 'Sub Admin'}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-card border-r border-border fixed h-full">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-60">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border h-14 flex items-center px-4 md:px-6 gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-heading font-semibold flex-1">{currentPage}</h1>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
