import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { SearchOverlay } from "@/components/SearchOverlay";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onSearchOpen={() => setSearchOpen(true)} onCartOpen={() => setCartOpen(true)} />
      <main className="flex-1 pt-14 md:pt-16">
        <Outlet />
      </main>
      <Footer />
      <BottomNav onSearchOpen={() => setSearchOpen(true)} onCartOpen={() => setCartOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
