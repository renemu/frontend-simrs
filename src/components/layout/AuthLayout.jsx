import React from "react";
import { Activity, Moon, Sun } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";

export function AuthLayout({ children }) {
  const { darkMode, setDarkMode } = useAuth();

  return (
    <div className="min-h-screen w-full flex flex-col bg-muted/20 text-foreground">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-bold text-base tracking-tight">SIMRS</span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Mode Terang" : "Mode Gelap"}
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
