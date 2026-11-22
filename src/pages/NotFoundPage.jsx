import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "../components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">
        404 — Halaman Tidak Ditemukan
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Maaf, rute atau modul yang Anda tuju tidak tersedia atau telah
        dipindahkan.
      </p>
      <div className="mt-6">
        <Link to="/dashboard">
          <Button>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
