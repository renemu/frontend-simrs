import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  ChevronRight,
  LogOut,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { DynamicIcon } from "../../lib/icons";
import { cn, getInitials } from "../../lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";

// Minimal fallback menu if backend menus array is empty
const DEFAULT_MENUS = [
  {
    id: 1,
    name: "Dashboard",
    code: "dashboard",
    icon: "LayoutDashboardIcon",
    path: "/dashboard",
    permissions: { read: true },
    children: [],
  },
];

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
}) {
  const { user, menus, logout } = useAuth();
  const location = useLocation();
  const sidebarType = user?.sidebar_type || "floating";
  const floatingMenuRef = useRef(null);
  const closeTimerRef = useRef(null);

  // Floating submenu state when desktop sidebar is collapsed
  const [floatingMenu, setFloatingMenu] = useState(null); // { item, top, left }

  // Filter accessible menus based on `permissions.read`
  const accessibleMenus = useMemo(() => {
    const source = Array.isArray(menus) && menus.length > 0 ? menus : DEFAULT_MENUS;

    const filterTree = (nodes) =>
      nodes
        .map((node) => {
          const filteredChildren = Array.isArray(node.children)
            ? filterTree(node.children)
            : [];
          const canRead =
            node?.permissions?.read !== false || filteredChildren.length > 0;
          if (!canRead) return null;
          return {
            ...node,
            children: filteredChildren,
          };
        })
        .filter(Boolean);

    return filterTree(source);
  }, [menus]);

  // Track open parent groups
  const [openGroups, setOpenGroups] = useState({});

  // Auto-open parent group when current location matches one of its children
  useEffect(() => {
    const nextOpen = {};
    accessibleMenus.forEach((item) => {
      if (Array.isArray(item.children) && item.children.length > 0) {
        const hasActiveChild = item.children.some(
          (child) =>
            child.path &&
            (location.pathname === child.path ||
              location.pathname.startsWith(`${child.path}/`))
        );
        if (hasActiveChild) {
          nextOpen[item.id] = true;
        }
      }
    });
    setOpenGroups((prev) => ({ ...prev, ...nextOpen }));
  }, [location.pathname, accessibleMenus]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeFloatingMenu = useCallback(() => {
    clearCloseTimer();
    setFloatingMenu(null);
  }, [clearCloseTimer]);

  const scheduleCloseFloatingMenu = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setFloatingMenu(null);
    }, 160);
  }, [clearCloseTimer]);

  const openFloatingMenuFor = useCallback(
    (item, triggerEl) => {
      if (!triggerEl) return;
      clearCloseTimer();
      const rect = triggerEl.getBoundingClientRect();
      const estimatedHeight = Math.min(360, 52 + (item.children?.length || 0) * 38);
      const maxTop = Math.max(12, window.innerHeight - estimatedHeight - 12);
      const top = Math.max(12, Math.min(rect.top, maxTop));
      const left = rect.right + 10;
      setFloatingMenu({ item, top, left });
    },
    [clearCloseTimer]
  );

  // Close floating submenu on route change, sidebar expand, outside click, or Escape
  useEffect(() => {
    closeFloatingMenu();
  }, [location.pathname, collapsed, closeFloatingMenu]);

  useEffect(() => {
    if (!floatingMenu) return;

    const handlePointerDown = (e) => {
      if (
        floatingMenuRef.current &&
        !floatingMenuRef.current.contains(e.target) &&
        !e.target.closest?.("[data-collapsed-parent-trigger]")
      ) {
        closeFloatingMenu();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeFloatingMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [floatingMenu, closeFloatingMenu]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const toggleGroup = (item, triggerEl, isMobileDrawer) => {
    const isCollapsed = !isMobileDrawer && collapsed;
    if (isCollapsed) {
      if (floatingMenu?.item?.id === item.id) {
        closeFloatingMenu();
      } else {
        openFloatingMenuFor(item, triggerEl);
      }
      return;
    }
    setOpenGroups((prev) => ({
      ...prev,
      [item.id]: !prev[item.id],
    }));
  };

  const renderMenuItem = (item, isMobileDrawer = false) => {
    const isCollapsed = !isMobileDrawer && collapsed;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isGroupOpen = Boolean(openGroups[item.id]);
    const isFloatingOpen = isCollapsed && floatingMenu?.item?.id === item.id;
    const isChildActive =
      hasChildren &&
      item.children.some(
        (c) =>
          c.path &&
          (location.pathname === c.path ||
            location.pathname.startsWith(`${c.path}/`))
      );

    if (hasChildren) {
      return (
        <div key={item.id} className="space-y-1">
          <button
            type="button"
            data-collapsed-parent-trigger={isCollapsed ? "true" : undefined}
            aria-expanded={isCollapsed ? isFloatingOpen : isGroupOpen}
            aria-haspopup={isCollapsed ? "menu" : undefined}
            onClick={(e) => toggleGroup(item, e.currentTarget, isMobileDrawer)}
            onMouseEnter={(e) => {
              if (isCollapsed) {
                openFloatingMenuFor(item, e.currentTarget);
              }
            }}
            onMouseLeave={() => {
              if (isCollapsed) {
                scheduleCloseFloatingMenu();
              }
            }}
            aria-label={isCollapsed ? item.name : undefined}
            className={cn(
              "group relative flex w-full items-center rounded-lg py-2 text-sm font-medium transition-all duration-200",
              isCollapsed ? "justify-center px-2" : "justify-between px-3",
              isChildActive || isFloatingOpen
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div
              className={cn(
                "flex items-center min-w-0 transition-all duration-200",
                isCollapsed ? "gap-0" : "gap-3"
              )}
            >
              <DynamicIcon
                name={item.icon}
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isChildActive || isFloatingOpen
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "truncate whitespace-nowrap transition-all duration-300 ease-in-out",
                  isCollapsed
                    ? "max-w-0 opacity-0 overflow-hidden"
                    : "max-w-[180px] opacity-100"
                )}
              >
                {item.name}
              </span>
            </div>
            {isCollapsed ? (
              <ChevronRight className="absolute right-1 h-2.5 w-2.5 text-muted-foreground/70" />
            ) : (
              <span className="text-muted-foreground shrink-0">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 ease-in-out",
                    isGroupOpen && "rotate-90"
                  )}
                />
              </span>
            )}
          </button>

          {/* Animated accordion submenu */}
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-in-out",
              !isCollapsed && isGroupOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0 pointer-events-none"
            )}
          >
            <div className="overflow-hidden">
              <div className="ml-4 space-y-1 border-l border-border/70 pl-3 py-0.5">
                {item.children.map((child) => {
                  const targetPath = child.path || `/module/${child.code}`;
                  return (
                    <NavLink
                      key={child.id}
                      to={targetPath}
                      end
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-xs"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )
                      }
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <DynamicIcon
                          name={child.icon}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <span className="truncate">{child.name}</span>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const targetPath = item.path || `/module/${item.code}`;
    return (
      <NavLink
        key={item.id}
        to={targetPath}
        end={targetPath === "/dashboard"}
        onClick={onCloseMobile}
        onMouseEnter={() => {
          if (isCollapsed && floatingMenu) {
            closeFloatingMenu();
          }
        }}
        title={isCollapsed ? item.name : undefined}
        className={({ isActive }) =>
          cn(
            "flex items-center rounded-lg py-2 text-sm font-medium transition-all duration-200",
            isCollapsed ? "justify-center px-2 gap-0" : "px-3 gap-3",
            isActive
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )
        }
      >
        <DynamicIcon name={item.icon} className="h-4 w-4 shrink-0" />
        <span
          className={cn(
            "truncate whitespace-nowrap transition-all duration-300 ease-in-out",
            isCollapsed
              ? "max-w-0 opacity-0 overflow-hidden"
              : "max-w-[180px] opacity-100"
          )}
        >
          {item.name}
        </span>
      </NavLink>
    );
  };

  const renderSidebarContent = (isMobileDrawer = false) => {
    const isCollapsed = !isMobileDrawer && collapsed;
    return (
      <div
        className={cn(
          "flex h-full flex-col bg-sidebar text-sidebar-foreground overflow-hidden transition-all duration-300 ease-in-out",
          !isMobileDrawer && sidebarType === "floating"
            ? "lg:my-2 lg:ml-2 lg:h-[calc(100%-1rem)] lg:rounded-2xl lg:border lg:shadow-sm"
            : "border-r"
        )}
      >
        {/* Top Brand Header aligned with Header h-14 */}
        <div
          className={cn(
            "shrink-0 flex h-14 items-center border-b border-sidebar-border transition-all duration-300 ease-in-out",
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          <div
            className={cn(
              "flex items-center min-w-0 transition-all duration-300 ease-in-out",
              isCollapsed ? "gap-0" : "gap-3"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <div
              className={cn(
                "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                isCollapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100"
              )}
            >
              <span className="font-bold text-sm tracking-tight block truncate">
                SIMRS
              </span>
              <p className="text-[11px] text-muted-foreground truncate">
                Hospital Management
              </p>
            </div>
          </div>

          {/* Mobile close button only */}
          {isMobileDrawer && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCloseMobile}
              className="lg:hidden h-8 w-8 shrink-0"
              title="Tutup Menu"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation Group */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-4"
          onScroll={() => {
            if (isCollapsed && floatingMenu) {
              closeFloatingMenu();
            }
          }}
        >
          <div>
            <p
              className={cn(
                "px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
                isCollapsed ? "max-h-0 opacity-0 mb-0" : "max-h-6 opacity-100 mb-2"
              )}
            >
              Menu Navigasi
            </p>
            <nav className="space-y-1">
              {accessibleMenus.map((item) =>
                renderMenuItem(item, isMobileDrawer)
              )}
            </nav>
          </div>
        </div>

        {/* Bottom User Card */}
        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              "flex items-center rounded-xl bg-muted/50 transition-all duration-300 ease-in-out",
              isCollapsed ? "justify-center p-2 gap-0" : "p-2.5 gap-3"
            )}
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback>
                {getInitials(user?.name || user?.email)}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
                isCollapsed
                  ? "max-w-0 opacity-0 flex-none"
                  : "max-w-[140px] opacity-100 flex-1"
              )}
            >
              <p className="text-xs font-semibold truncate">
                {user?.name || user?.email}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Shield className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">
                  {user?.role?.display_name || user?.role?.name || "User"}
                </span>
              </div>
            </div>
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar with smooth width animation, full viewport height */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 h-full overflow-hidden transition-[width] duration-300 ease-in-out will-change-[width]",
          collapsed
            ? sidebarType === "floating"
              ? "w-[80px]"
              : "w-[72px]"
            : sidebarType === "floating"
            ? "w-72"
            : "w-64"
        )}
      >
        <div className="h-full">{renderSidebarContent(false)}</div>
      </aside>

      {/* Mobile Drawer Overlay with smooth fade + slide animation */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden flex transition-opacity duration-300 ease-in-out",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
          onClick={onCloseMobile}
        />
        <div
          className={cn(
            "relative z-50 w-72 max-w-[85vw] h-full transform transition-transform duration-300 ease-in-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {renderSidebarContent(true)}
        </div>
      </div>
      {/* Floating Submenu Portal for Collapsed Desktop Sidebar */}
      {collapsed &&
        floatingMenu &&
        createPortal(
          <div
            ref={floatingMenuRef}
            role="menu"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleCloseFloatingMenu}
            style={{
              top: `${floatingMenu.top}px`,
              left: `${floatingMenu.left}px`,
            }}
            className="fixed z-50 hidden lg:block min-w-[220px] max-w-[260px] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-left-1 duration-150"
          >
            <div className="flex items-center gap-2 border-b border-border/70 px-2.5 py-2 mb-1">
              <DynamicIcon
                name={floatingMenu.item.icon}
                className="h-3.5 w-3.5 text-primary shrink-0"
              />
              <span className="text-xs font-semibold tracking-tight truncate">
                {floatingMenu.item.name}
              </span>
            </div>
            <div className="space-y-0.5">
              {floatingMenu.item.children.map((child) => {
                const targetPath = child.path || `/module/${child.code}`;
                return (
                  <NavLink
                    key={child.id}
                    to={targetPath}
                    end
                    onClick={closeFloatingMenu}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-xs"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )
                    }
                  >
                    <DynamicIcon
                      name={child.icon}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className="truncate">{child.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
