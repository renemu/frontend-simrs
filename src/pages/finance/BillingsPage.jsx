import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Eye,
  FileSpreadsheet,
  Info,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { billingService } from "../../services/finance.service";
import { visitService } from "../../services/outpatient.service";

const PAY_BADGE = {
  unpaid: { label: "Belum Lunas", variant: "destructive" },
  partially_paid: { label: "Dibayar Sebagian", variant: "warning" },
  paid: { label: "Lunas", variant: "success" },
};

export function printInvoiceDocument(invoice) {
  if (!invoice) return;
  const win = window.open("", "_blank", "width=820,height=900");
  if (!win) return;

  const itemsHtml = (invoice.items || [])
    .map(
      (it, idx) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${it.description}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${it.item_type}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(it.unit_price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatCurrency(it.line_total)}</td>
      </tr>`
    )
    .join("");

  const paymentsHtml = (invoice.payments || [])
    .map(
      (p) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${p.payment_reference}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${formatDateTime(p.paid_at)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${p.payment_channel || p.payment_method}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatCurrency(p.amount)}</td>
      </tr>`
    )
    .join("");

  const statusLabel =
    invoice.payment_status === "paid"
      ? "LUNAS"
      : invoice.payment_status === "partially_paid"
      ? "DIBAYAR SEBAGIAN"
      : "BELUM LUNAS";

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; padding: 32px; }
          .header { display:flex; justify-content:space-between; border-bottom:2px solid #111827; padding-bottom:16px; margin-bottom:20px; }
          .badge { display:inline-block; padding:4px 10px; border:1px solid #111827; font-weight:700; font-size:12px; border-radius:6px; }
          table { width:100%; border-collapse:collapse; font-size:13px; margin-top:12px; }
          th { background:#f3f4f6; text-align:left; padding:8px; border-bottom:1px solid #d1d5db; }
          .summary { margin-top:20px; margin-left:auto; width:300px; font-size:14px; }
          .summary-row { display:flex; justify-content:space-between; padding:4px 0; }
          .summary-total { border-top:2px solid #111827; padding-top:8px; margin-top:6px; font-weight:700; font-size:16px; }
          @media print { .no-print { display:none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0;">RS SIMRS INOVA MEDIKA</h2>
            <p style="margin:4px 0 0;font-size:12px;color:#4b5563;">Instalasi Pelayanan Rawat Jalan — Invoice &amp; Bukti Pembayaran</p>
          </div>
          <div style="text-align:right;">
            <div style="font-family:monospace;font-size:16px;font-weight:700;">${invoice.invoice_number}</div>
            <div style="font-size:12px;color:#4b5563;">Revisi #${invoice.revision_number} • ${formatDateTime(invoice.issued_at)}</div>
            <div style="margin-top:6px;"><span class="badge">${statusLabel}</span></div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:20px;">
          <div>
            <strong>Pasien:</strong> ${invoice.patient?.full_name || "-"}<br/>
            <strong>No. RM:</strong> ${invoice.patient?.medical_record_number || "-"}<br/>
            <strong>Alamat:</strong> ${invoice.patient?.address || "-"}
          </div>
          <div style="text-align:right;">
            <strong>No. Kunjungan:</strong> ${invoice.visit?.visit_number || "-"}<br/>
            <strong>Poliklinik:</strong> ${invoice.visit?.department_name || "-"}<br/>
            <strong>Dokter:</strong> ${invoice.visit?.doctor_name || "-"}
          </div>
        </div>

        <h4 style="margin:0 0 6px;">Rincian Komponen Biaya</h4>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Deskripsi Layanan</th>
              <th>Kategori</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Harga Satuan</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div class="summary">
          <div class="summary-row"><span>Total Tagihan</span><strong>${formatCurrency(invoice.total_amount)}</strong></div>
          <div class="summary-row"><span>Total Dibayar</span><span>${formatCurrency(invoice.paid_amount)}</span></div>
          <div class="summary-row summary-total"><span>Sisa Tagihan</span><span>${formatCurrency(invoice.balance_amount)}</span></div>
        </div>

        ${
          paymentsHtml
            ? `<h4 style="margin:24px 0 6px;">Riwayat Pembayaran</h4>
               <table>
                 <thead><tr><th>Referensi</th><th>Tanggal</th><th>Metode</th><th style="text-align:right;">Nominal</th></tr></thead>
                 <tbody>${paymentsHtml}</tbody>
               </table>`
            : ""
        }

        <div class="no-print" style="margin-top:28px;text-align:center;">
          <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;">Cetak / Simpan PDF</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}

export default function BillingsPage() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canCreate = hasPermission("billings", "create");
  const canUpdate = hasPermission("billings", "update");
  const canPay = hasPermission("payments", "create");

  const [invoices, setInvoices] = useState([]);
  const [visits, setVisits] = useState([]);
  const [payFilter, setPayFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Generate invoice dialog
  const [genOpen, setGenOpen] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [genNotes, setGenNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Detail & print dialog
  const [detailInvoice, setDetailInvoice] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, visitRes] = await Promise.all([
        billingService.list({
          payment_status: payFilter || undefined,
          search: search.trim() || undefined,
          per_page: 50,
        }),
        visitService.list({ per_page: 50 }).catch(() => ({ data: [] })),
      ]);
      setInvoices(Array.isArray(invRes?.data) ? invRes.data : []);
      setVisits(
        (Array.isArray(visitRes?.data) ? visitRes.data : []).filter(
          (v) => v.status !== "cancelled"
        )
      );
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal memuat data billing." });
    } finally {
      setLoading(false);
    }
  }, [payFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenGenerate = () => {
    const activeVisitIds = new Set(
      invoices.filter((i) => i.status === "issued").map((i) => i.visit_id)
    );
    const unbilled = visits.filter((v) => !activeVisitIds.has(v.id));
    setSelectedVisitId(unbilled[0] ? String(unbilled[0].id) : visits[0] ? String(visits[0].id) : "");
    setGenNotes("");
    setGenOpen(true);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedVisitId) return;
    setSaving(true);
    setFeedback({ type: "", message: "" });
    try {
      const res = await billingService.generateForVisit(Number(selectedVisitId), genNotes);
      setGenOpen(false);
      setFeedback({
        type: "success",
        message: `Tagihan ${res?.data?.invoice_number} berhasil diterbitkan (Total: ${formatCurrency(res?.data?.total_amount)}).`,
      });
      loadData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal menerbitkan tagihan." });
    } finally {
      setSaving(false);
    }
  };

  const handleRevise = async (invoice) => {
    const reason = window.prompt(
      `Revisi tagihan ${invoice.invoice_number} karena perubahan tindakan/obat pasca-billing. Masukkan alasan revisi:`,
      "Penyesuaian item layanan medis"
    );
    if (reason === null) return;
    try {
      const res = await billingService.revise(invoice.id, reason);
      setFeedback({
        type: "success",
        message: `Tagihan direvisi menjadi ${res?.data?.invoice_number} (Rev #${res?.data?.revision_number}).`,
      });
      loadData();
    } catch (err) {
      setFeedback({ type: "error", message: err?.message || "Gagal merevisi tagihan." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Tagihan / Billing Rawat Jalan
          </h1>
          <p className="text-sm text-muted-foreground">
            Konsolidasi biaya pendaftaran, konsultasi, tindakan, lab, dan obat resep ke dalam invoice
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" /> Muat Ulang
          </Button>
          {canCreate && (
            <Button size="sm" onClick={handleOpenGenerate}>
              <Plus className="h-4 w-4" /> Generate Tagihan
            </Button>
          )}
        </div>
      </div>

      {!canCreate && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Anda masuk sebagai <strong>{user?.role?.display_name || user?.role?.name}</strong> (Mode Lihat Saja). Penerbitan &amp; revisi tagihan dilakukan oleh akun <strong>Kasir</strong> (<code className="font-mono text-xs">cashier@example.com</code>).
          </AlertDescription>
        </Alert>
      )}

      {feedback.message && (
        <Alert variant={feedback.type === "error" ? "destructive" : "success"}>
          {feedback.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Daftar Invoice ({invoices.length})</CardTitle>
              <CardDescription>Total tagihan dihitung otomatis di backend dari item layanan tersimpan</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-52">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari No. invoice / pasien..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={payFilter}
                onChange={(e) => setPayFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Semua Status Bayar</option>
                <option value="unpaid">Belum Lunas</option>
                <option value="partially_paid">Dibayar Sebagian</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Invoice</TableHead>
                <TableHead>Pasien &amp; Kunjungan</TableHead>
                <TableHead>Total Tagihan</TableHead>
                <TableHead>Terbayar / Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Memuat tagihan...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Belum ada invoice diterbitkan.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const payBadge = PAY_BADGE[inv.payment_status] || { label: inv.payment_status, variant: "secondary" };
                  return (
                    <TableRow key={inv.id} className={inv.status !== "issued" ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="font-mono text-xs font-bold">{inv.invoice_number}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Rev #{inv.revision_number} • {inv.status}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{inv.patient?.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {inv.visit?.visit_number} • {inv.visit?.department_name}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {formatCurrency(inv.total_amount)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="text-emerald-600">{formatCurrency(inv.paid_amount)}</div>
                        <div className="text-muted-foreground">Sisa: {formatCurrency(inv.balance_amount)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payBadge.variant}>{payBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetailInvoice(inv)} title="Lihat Detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => printInvoiceDocument(inv)} title="Cetak Invoice">
                            <Printer className="h-4 w-4" />
                          </Button>
                          {canUpdate && inv.status === "issued" && inv.payment_status !== "paid" && (
                            <Button size="sm" variant="ghost" onClick={() => handleRevise(inv)} title="Revisi Invoice (BR-12)">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {canPay && inv.status === "issued" && inv.payment_status !== "paid" && (
                            <Button
                              size="sm"
                              onClick={() => navigate(`/finance/payments?invoiceId=${inv.id}`)}
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Bayar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generate Invoice Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent onClose={() => setGenOpen(false)}>
          <form onSubmit={handleGenerate}>
            <DialogHeader>
              <DialogTitle>Generate Tagihan Kunjungan</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label>Pilih Kunjungan Pasien</Label>
                <select
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={selectedVisitId}
                  onChange={(e) => setSelectedVisitId(e.target.value)}
                >
                  <option value="">-- Pilih Kunjungan --</option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.visit_number} — {v.patient?.full_name} ({v.department?.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan Tagihan (Opsional)</Label>
                <Input value={genNotes} onChange={(e) => setGenNotes(e.target.value)} placeholder="Catatan kasir..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>Terbitkan Invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Invoice Dialog */}
      <Dialog open={Boolean(detailInvoice)} onOpenChange={() => setDetailInvoice(null)}>
        <DialogContent onClose={() => setDetailInvoice(null)}>
          {detailInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-6">
                  <span>Invoice {detailInvoice.invoice_number}</span>
                  <Badge variant={PAY_BADGE[detailInvoice.payment_status]?.variant || "secondary"}>
                    {PAY_BADGE[detailInvoice.payment_status]?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-xs">
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3">
                  <div>
                    <div className="text-muted-foreground">Pasien</div>
                    <div className="font-semibold text-sm">{detailInvoice.patient?.full_name}</div>
                    <div className="font-mono">{detailInvoice.patient?.medical_record_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">Kunjungan</div>
                    <div className="font-mono font-semibold">{detailInvoice.visit?.visit_number}</div>
                    <div>{detailInvoice.visit?.department_name}</div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Komponen Biaya</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detailInvoice.items || []).map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <div className="font-medium">{it.description}</div>
                          <div className="text-[10px] uppercase text-muted-foreground">{it.item_type}</div>
                        </TableCell>
                        <TableCell>{it.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(it.line_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="space-y-1 border-t pt-3">
                  <div className="flex justify-between">
                    <span>Total Tagihan</span>
                    <strong className="font-mono">{formatCurrency(detailInvoice.total_amount)}</strong>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Total Terbayar</span>
                    <span className="font-mono">{formatCurrency(detailInvoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-1.5">
                    <span>Sisa Tagihan</span>
                    <span className="font-mono">{formatCurrency(detailInvoice.balance_amount)}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailInvoice(null)}>Tutup</Button>
                <Button onClick={() => printInvoiceDocument(detailInvoice)}>
                  <Printer className="h-4 w-4" /> Cetak Invoice / Kwitansi
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
