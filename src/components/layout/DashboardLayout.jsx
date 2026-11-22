import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const SIDEBAR_COLLAPSED_KEY = "simrs_sidebar_collapsed";

export function DashboardLayout() {
  const { apiInfo } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Persist sidebar collapsed preference in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Ignore storage errors (e.g. private browsing restrictions)
    }
  }, [collapsed]);

  // Listen to scroll position of the scrollable <main> container
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 200);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset scroll to top when navigating between pages
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
    setShowScrollTop(false);
  }, [location.pathname]);

  const handleScrollToTop = () => {
    mainRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex h-screen supports-[height:100dvh]:h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="relative flex flex-1 flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ease-in-out">
        <Header
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
        >
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
            <Outlet />
          </div>
        </main>

        {/* Smooth Scroll-to-Top Floating Button */}
        <Button
          type="button"
          size="icon"
          onClick={handleScrollToTop}
          title="Kembali ke atas"
          aria-label="Kembali ke atas"
          className={cn(
            "fixed lg:absolute bottom-14 right-4 sm:right-6 z-40 h-10 w-10 rounded-full shadow-lg transition-all duration-300 ease-in-out hover:scale-105 active:scale-95",
            showScrollTop
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-3 pointer-events-none"
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>

        <footer className="shrink-0 h-11 border-t bg-background/95 px-4 sm:px-6 text-xs text-muted-foreground flex items-center justify-between">
          <span className="font-medium text-foreground">SIMRS</span>
          <span className="font-mono">v{apiInfo?.version || "1.0.0"}</span>
        </footer>
      </div>
    </div>
  );
}
