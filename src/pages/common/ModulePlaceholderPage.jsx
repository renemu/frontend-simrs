import React from "react";
import { Check, Layers, ShieldCheck, X } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useAuth } from "../../context/AuthContext";

/**
 * Displays a structured module readiness placeholder for upcoming SIMRS domain modules
 * while proving active RBAC route & permission gating per role.
 */
export default function ModulePlaceholderPage({
  title,
  moduleCode,
  requirementRef,
  description,
}) {
  const { user, hasPermission } = useAuth();
  const actions = [
    { key: "create", label: "Create" },
    { key: "read", label: "Read" },
    { key: "update", label: "Update" },
    { key: "delete", label: "Delete" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="outline" className="font-mono text-xs">
            {moduleCode}
          </Badge>
          {requirementRef && (
            <Badge variant="secondary" className="text-xs">
              {requirementRef}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Status Tahap Implementasi Modul
          </CardTitle>
          <CardDescription>
            Hak akses untuk modul ini sudah aktif. Fitur operasional pada modul
            ini sedang dalam tahap pengembangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>
                Hak Akses Efektif Anda sebagai{" "}
                <strong>
                  {user?.role?.display_name || user?.role?.name || "-"}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {actions.map(({ key, label }) => {
                const allowed = hasPermission(moduleCode, key);
                return (
                  <Badge
                    key={key}
                    variant={allowed ? "success" : "secondary"}
                    className="gap-1.5 px-2.5 py-1"
                  >
                    {allowed ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3 opacity-60" />
                    )}
                    {label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
