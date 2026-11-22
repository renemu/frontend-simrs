import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { DynamicIcon } from "../../lib/icons";
import { cn, getInitials } from "../../lib/utils";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
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
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) {
  const { user, menus, logout } = useAuth();
  const location = useLocation();
  const sidebarType = user?.sidebar_type || "floating";

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

  const toggleGroup = (id) => {
    if (collapsed) {
      onToggleCollapse?.();
    }
    setOpenGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderMenuItem = (item) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isGroupOpen = Boolean(openGroups[item.id]);
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
            onClick={() => toggleGroup(item.id)}
            title={collapsed ? item.name : undefined}
            className={cn(
              "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isChildActive
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <DynamicIcon
                name={item.icon}
                className={cn(
                  "h-4 w-4 shrink-0",
                  isChildActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </div>
            {!collapsed && (
              <span className="text-muted-foreground">
                {isGroupOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            )}
          </button>

          {!collapsed && isGroupOpen && (
            <div className="ml-4 space-y-1 border-l border-border/70 pl-3">
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
          )}
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
        title={collapsed ? item.name : undefined}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )
        }
      >
        <DynamicIcon name={item.icon} className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.name}</span>}
      </NavLink>
    );
  };

  const sidebarContent = (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
        sidebarType === "floating"
          ? "lg:m-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-2xl lg:border lg:shadow-sm"
          : "border-r"
      )}
    >
      {/* Top Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight truncate">
                  SIMRS App
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Yii2
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Hospital Management
              </p>
            </div>
          )}
        </div>

        {/* Desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="hidden lg:inline-flex h-8 w-8 text-muted-foreground"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onCloseMobile}
          className="lg:hidden h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Group */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Menu Navigasi
            </p>
          )}
          <nav className="space-y-1">
            {accessibleMenus.map((item) => renderMenuItem(item))}
          </nav>
        </div>
      </div>

      {/* Bottom User Card */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl bg-muted/50 p-2.5",
            collapsed && "justify-center p-2"
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback>
              {getInitials(user?.name || user?.email)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
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
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Logout"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-200",
          collapsed
            ? sidebarType === "floating"
              ? "w-22"
              : "w-18"
            : sidebarType === "floating"
            ? "w-72"
            : "w-64"
        )}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 w-72 max-w-[85vw] h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
