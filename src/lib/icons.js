import React from "react";
import {
  LayoutDashboard,
  Settings,
  Users,
  Bell,
  User,
  Shield,
  AppWindow,
  Palette,
  Plug,
  ListTree,
  FileText,
  Folder,
  Activity,
  Lock,
  Database,
  Layers,
  Building2,
} from "lucide-react";

/**
 * Maps icon names stored in backend-yii2 `modules.icon` column to Lucide React components.
 */
const ICON_MAP = {
  LayoutDashboardIcon: LayoutDashboard,
  LayoutDashboard: LayoutDashboard,
  SettingsIcon: Settings,
  Settings: Settings,
  UsersIcon: Users,
  Users: Users,
  BellIcon: Bell,
  Bell: Bell,
  UserIcon: User,
  User: User,
  ShieldIcon: Shield,
  Shield: Shield,
  AppWindowIcon: AppWindow,
  AppWindow: AppWindow,
  PaletteIcon: Palette,
  Palette: Palette,
  PlugIcon: Plug,
  Plug: Plug,
  ListTreeIcon: ListTree,
  ListTree: ListTree,
  FileTextIcon: FileText,
  FileText: FileText,
  ActivityIcon: Activity,
  LockIcon: Lock,
  DatabaseIcon: Database,
  LayersIcon: Layers,
  Building2Icon: Building2,
};

export function DynamicIcon({ name, className = "h-4 w-4", ...props }) {
  const IconComponent = ICON_MAP[name] || Folder;
  return <IconComponent className={className} {...props} />;
}

export { ICON_MAP };
