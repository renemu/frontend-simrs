import { formatCurrency, formatDate, formatDateTime } from "../../lib/utils";

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeCsvCell(val) {
  const str = String(val ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const ITEM_TYPE_LABEL = {
  registration: "Pendaftaran",
  consultation: "Konsultasi Dokter",
  procedure: "Tindakan Medis",
  laboratory: "Laboratorium & Penunjang",
  medicine: "Obat / Farmasi",
};

const MODALITY_LABEL = {
  lab_clinical: "Laboratorium Klinis",
  ct_scan: "CT-Scan",
  xray: "X-Ray / Radiografi",
  mri: "MRI",
  usg: "USG",
  ekg: "EKG",
  other: "Penunjang Lainnya",
};

export function getModalityLabel(code) {
  return MODALITY_LABEL[code] || code || "-";
}

export function getItemTypeLabel(code) {
  return ITEM_TYPE_LABEL[code] || code || "-";
}

/**
 * Generates and downloads an Excel-friendly UTF-8 BOM CSV file for the active SIMRS report.
 */
export function exportReportToCsv(reportData, detailRows = [], activeReportType = "all") {
  if (!reportData) return;

  const lines = [];
  const pushRow = (cols) => lines.push(cols.map(escapeCsvCell).join(","));

  const std = reportData.report_standard || {};
  const period = reportData.period || {};
  const sections = reportData.sections || {};

  pushRow(["RS SIMRS — LAPORAN STANDAR PELAYANAN RAWAT JALAN"]);
  pushRow(["Kode Standar", std.code || activeReportType.toUpperCase()]);
  pushRow(["Judul Laporan", std.title || "Laporan SIMRS"]);
  pushRow(["Periode", period.label || `${period.from || ""} s/d ${period.to || ""}`]);
  pushRow(["Rentang Tanggal", `${period.from || "-"} s/d ${period.to || "-"}`]);
  pushRow(["Tanggal Ekspor", formatDateTime(new Date().toISOString())]);
  pushRow([]);

  if (sections.visits && (activeReportType === "all" || activeReportType === "visits")) {
    const v = sections.visits.summary || {};
    pushRow(["=== RL 5.2 REKAPITULASI KUNJUNGAN RAWAT JALAN ==="]);
    pushRow(["Total Kunjungan", "Pasien Unik", "Pasien Baru", "Pasien Lama", "Laki-laki", "Perempuan", "Selesai", "Batal"]);
    pushRow([v.total_visits, v.unique_patients, v.new_patient_visits, v.returning_patient_visits, v.male_visits, v.female_visits, v.completed, v.cancelled]);
    pushRow([]);
    pushRow(["Kode Poli", "Poliklinik", "Total", "Pasien Baru", "Pasien Lama", "Laki-laki", "Perempuan", "Selesai", "Batal"]);
    (sections.visits.by_department || []).forEach((d) => {
      pushRow([d.code, d.name, d.total_visits, d.new_patients, d.returning_patients, d.male_count, d.female_count, d.completed_visits, d.cancelled_visits]);
    });
    pushRow([]);
  }

  if (sections.morbidity && (activeReportType === "all" || activeReportType === "morbidity")) {
    pushRow(["=== RL 5.4 — 10 BESAR PENYAKIT RAWAT JALAN ==="]);
    pushRow(["Peringkat", "Diagnosis Utama", "Kasus Baru", "Kasus Lama", "Laki-laki", "Perempuan", "Total Kasus", "Persentase (%)"]);
    (sections.morbidity.top_diagnoses || []).forEach((d) => {
      pushRow([d.rank, d.diagnosis, d.new_cases, d.returning_cases, d.male_cases, d.female_cases, d.total_cases, d.percentage]);
    });
    pushRow([]);
  }

  if (sections.procedures && (activeReportType === "all" || activeReportType === "procedures")) {
    pushRow(["=== LAPORAN TINDAKAN MEDIS ==="]);
    pushRow(["Kode", "Nama Tindakan", "Kategori", "Frekuensi", "Total Qty", "Total Tarif (IDR)"]);
    (sections.procedures.top_procedures || []).forEach((p) => {
      pushRow([p.code, p.name, p.category, p.order_count, p.total_quantity, p.total_revenue]);
    });
    pushRow([]);
  }

  if (sections.pharmacy && (activeReportType === "all" || activeReportType === "pharmacy")) {
    pushRow(["=== LAPORAN FARMASI & PEMAKAIAN OBAT ==="]);
    pushRow(["Kode Obat", "Nama Obat", "Satuan", "Jml Resep", "Total Diserahkan", "Nilai Pemakaian (IDR)", "Sisa Stok", "Stok Min"]);
    (sections.pharmacy.medicine_usage || []).forEach((m) => {
      pushRow([m.code, m.name, m.unit, m.prescription_count, m.dispensed_qty, m.dispensed_value, m.current_stock, m.min_stock]);
    });
    pushRow([]);
  }

  if (sections.laboratory && (activeReportType === "all" || activeReportType === "laboratory")) {
    pushRow(["=== LAPORAN LABORATORIUM & PENUNJANG DIAGNOSTIK ==="]);
    pushRow(["Modalitas", "Total Order", "Selesai", "Synced Eksternal", "Total Tarif (IDR)"]);
    (sections.laboratory.by_modality || []).forEach((m) => {
      pushRow([getModalityLabel(m.modality_type), m.total_orders, m.completed_orders, m.synced_orders, m.total_tariff]);
    });
    pushRow([]);
  }

  if (sections.finance && (activeReportType === "all" || activeReportType === "finance")) {
    const fin = sections.finance.summary || {};
    pushRow(["=== LAPORAN KEUANGAN, BILLING & KASIR ==="]);
    pushRow(["Total Invoice", "Total Tagihan (IDR)", "Pendapatan Diterima (IDR)", "Sisa Piutang (IDR)", "Collection Rate (%)", "Tunai (IDR)", "Non-Tunai (IDR)"]);
    pushRow([fin.total_invoices, fin.total_billed, fin.total_paid, fin.total_outstanding, fin.collection_rate, fin.cash_total, fin.non_cash_total]);
    pushRow([]);
    pushRow(["Komponen Layanan", "Jml Item", "Total Qty", "Total Nominal (IDR)"]);
    (sections.finance.by_component || []).forEach((c) => {
      pushRow([getItemTypeLabel(c.item_type), c.item_count, c.total_quantity, c.total_amount]);
    });
    pushRow([]);
  }

  if (Array.isArray(detailRows) && detailRows.length > 0) {
    pushRow(["=== RINCIAN DATA TRANSAKSI ==="]);
    const keys = Object.keys(detailRows[0]);
    pushRow(keys);
    detailRows.forEach((row) => {
      pushRow(keys.map((k) => row[k]));
    });
  }

  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filePeriod = period.month || period.date || period.year || `${period.from || "start"}_${period.to || "end"}`;
  a.href = url;
  a.download = `laporan-simrs-${activeReportType}-${filePeriod}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens a formatted official SIMRS printable report window.
 */
export function printSimrsReport(reportData, activeReportType = "all", user = null, filterBadges = []) {
  if (!reportData) return;
  const win = window.open("", "_blank", "width=960,height=900");
  if (!win) return;

  const std = reportData.report_standard || {};
  const period = reportData.period || {};
  const sections = reportData.sections || {};

  let bodyHtml = "";

  if (sections.visits && (activeReportType === "all" || activeReportType === "visits")) {
    const v = sections.visits.summary || {};
    const deptRows = (sections.visits.by_department || [])
      .map(
        (d, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(d.code)}</td>
            <td>${escapeHtml(d.name)}</td>
            <td class="num">${d.total_visits}</td>
            <td class="num">${d.new_patients}</td>
            <td class="num">${d.returning_patients}</td>
            <td class="num">${d.male_count}</td>
            <td class="num">${d.female_count}</td>
            <td class="num">${d.completed_visits}</td>
            <td class="num">${d.cancelled_visits}</td>
          </tr>`
      )
      .join("");

    bodyHtml += `
      <div class="section">
        <h3>RL 5.2 — Rekapitulasi Kunjungan Rawat Jalan</h3>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">Total Kunjungan</div><div class="kpi-val">${v.total_visits ?? 0}</div><div class="kpi-sub">Pasien unik: ${v.unique_patients ?? 0}</div></div>
          <div class="kpi"><div class="kpi-label">Pasien Baru / Lama</div><div class="kpi-val">${v.new_patient_visits ?? 0} / ${v.returning_patient_visits ?? 0}</div><div class="kpi-sub">Standar RL 5.1/5.2</div></div>
          <div class="kpi"><div class="kpi-label">Laki-laki / Perempuan</div><div class="kpi-val">${v.male_visits ?? 0} / ${v.female_visits ?? 0}</div><div class="kpi-sub">Demografi gender</div></div>
          <div class="kpi"><div class="kpi-label">Selesai / Batal</div><div class="kpi-val">${v.completed ?? 0} / ${v.cancelled ?? 0}</div><div class="kpi-sub">Aktif: ${(v.registered ?? 0) + (v.in_progress ?? 0)}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>#</th><th>Kode</th><th>Poliklinik</th><th class="num">Total</th><th class="num">Baru</th><th class="num">Lama</th><th class="num">L</th><th class="num">P</th><th class="num">Selesai</th><th class="num">Batal</th></tr>
          </thead>
          <tbody>${deptRows || '<tr><td colspan="10" style="text-align:center;">Tidak ada data kunjungan</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  if (sections.morbidity && (activeReportType === "all" || activeReportType === "morbidity")) {
    const mRows = (sections.morbidity.top_diagnoses || [])
      .map(
        (d) => `
          <tr>
            <td class="num">${d.rank}</td>
            <td>${escapeHtml(d.diagnosis)}</td>
            <td class="num">${d.new_cases}</td>
            <td class="num">${d.returning_cases}</td>
            <td class="num">${d.male_cases}</td>
            <td class="num">${d.female_cases}</td>
            <td class="num"><strong>${d.total_cases}</strong></td>
            <td class="num">${d.percentage}%</td>
          </tr>`
      )
      .join("");

    bodyHtml += `
      <div class="section">
        <h3>RL 5.4 — 10 Besar Penyakit Rawat Jalan</h3>
        <table>
          <thead>
            <tr><th class="num">#</th><th>Diagnosis Utama</th><th class="num">Kasus Baru</th><th class="num">Kasus Lama</th><th class="num">L</th><th class="num">P</th><th class="num">Total</th><th class="num">%</th></tr>
          </thead>
          <tbody>${mRows || '<tr><td colspan="8" style="text-align:center;">Belum ada data diagnosis</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  if (sections.procedures && (activeReportType === "all" || activeReportType === "procedures")) {
    const pRows = (sections.procedures.top_procedures || [])
      .map(
        (p, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(p.code)}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category)}</td>
            <td class="num">${p.total_quantity}</td>
            <td class="num">${escapeHtml(formatCurrency(p.total_revenue))}</td>
          </tr>`
      )
      .join("");

    bodyHtml += `
      <div class="section">
        <h3>Rekapitulasi Tindakan Medis Rawat Jalan</h3>
        <table>
          <thead>
            <tr><th>#</th><th>Kode</th><th>Nama Tindakan</th><th>Kategori</th><th class="num">Qty</th><th class="num">Total Tarif</th></tr>
          </thead>
          <tbody>${pRows || '<tr><td colspan="6" style="text-align:center;">Tidak ada data tindakan medis</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  if (sections.pharmacy && (activeReportType === "all" || activeReportType === "pharmacy")) {
    const rx = sections.pharmacy.summary || {};
    const medRows = (sections.pharmacy.medicine_usage || [])
      .map(
        (m, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(m.code)}</td>
            <td>${escapeHtml(m.name)}</td>
            <td class="num">${m.dispensed_qty} ${escapeHtml(m.unit)}</td>
            <td class="num">${escapeHtml(formatCurrency(m.dispensed_value))}</td>
            <td class="num">${m.current_stock} ${escapeHtml(m.unit)}</td>
          </tr>`
      )
      .join("");

    bodyHtml += `
      <div class="section">
        <h3>Laporan Instalasi Farmasi &amp; Pemakaian Obat</h3>
        <p style="font-size:12px;margin:4px 0 8px;">Total Resep: <strong>${rx.total_prescriptions ?? 0}</strong> (Diserahkan: ${rx.dispensed_prescriptions ?? 0}, Pending: ${rx.pending_prescriptions ?? 0}) • Total Unit Keluar: <strong>${rx.total_dispensed_units ?? 0}</strong> • Nilai: <strong>${escapeHtml(formatCurrency(rx.total_dispensed_value))}</strong></p>
        <table>
          <thead>
            <tr><th>#</th><th>Kode</th><th>Nama Obat</th><th class="num">Diserahkan</th><th class="num">Nilai</th><th class="num">Sisa Stok</th></tr>
          </thead>
          <tbody>${medRows || '<tr><td colspan="6" style="text-align:center;">Tidak ada pemakaian obat</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  if (sections.laboratory && (activeReportType === "all" || activeReportType === "laboratory")) {
    const labRows = (sections.laboratory.by_modality || [])
      .map(
        (m, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(getModalityLabel(m.modality_type))}</td>
            <td class="num">${m.total_orders}</td>
            <td class="num">${m.completed_orders}</td>
            <td class="num">${m.synced_orders}</td>
            <td class="num">${escapeHtml(formatCurrency(m.total_tariff))}</td>
          </tr>`
      )
      .join("");

    bodyHtml += `
      <div class="section">
        <h3>RL 3.8 — Laporan Laboratorium &amp; Penunjang Diagnostik</h3>
        <table>
          <thead>
            <tr><th>#</th><th>Modalitas</th><th class="num">Total Order</th><th class="num">Selesai</th><th class="num">Synced Eksternal</th><th class="num">Total Tarif</th></tr>
          </thead>
          <tbody>${labRows || '<tr><td colspan="6" style="text-align:center;">Tidak ada order penunjang</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  if (sections.finance && (activeReportType === "all" || activeReportType === "finance")) {
    const fin = sections.finance.summary || {};
    const compRows = (sections.finance.by_component || [])
      .map(
        (c) => `
          <tr>
            <td>${escapeHtml(getItemTypeLabel(c.item_type))}</td>
            <td class="num">${c.item_count}</td>
            <td class="num">${c.total_quantity}</td>
            <td class="num">${escapeHtml(formatCurrency(c.total_amount))}</td>
          </tr>`
      )
      .join("");

    bodyHtml += `
      <div class="section">
        <h3>Laporan Keuangan, Billing &amp; Penerimaan Kasir</h3>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">Total Tagihan</div><div class="kpi-val">${escapeHtml(formatCurrency(fin.total_billed))}</div><div class="kpi-sub">${fin.total_invoices ?? 0} invoice</div></div>
          <div class="kpi"><div class="kpi-label">Pendapatan Diterima</div><div class="kpi-val">${escapeHtml(formatCurrency(fin.total_paid))}</div><div class="kpi-sub">Collection rate: ${fin.collection_rate ?? 0}%</div></div>
          <div class="kpi"><div class="kpi-label">Sisa Piutang</div><div class="kpi-val">${escapeHtml(formatCurrency(fin.total_outstanding))}</div><div class="kpi-sub">Unpaid: ${fin.unpaid_count ?? 0}, Parsial: ${fin.partially_paid_count ?? 0}</div></div>
          <div class="kpi"><div class="kpi-label">Tunai / Non-Tunai</div><div class="kpi-val">${escapeHtml(formatCurrency(fin.cash_total))}</div><div class="kpi-sub">Non-tunai: ${escapeHtml(formatCurrency(fin.non_cash_total))}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>Komponen Layanan</th><th class="num">Jumlah Item</th><th class="num">Total Qty</th><th class="num">Total Tagihan</th></tr>
          </thead>
          <tbody>${compRows || '<tr><td colspan="4" style="text-align:center;">Tidak ada komponen billing</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  const filterText = filterBadges.length > 0 ? filterBadges.join(" • ") : "Semua Poliklinik & Dokter";

  win.document.write(`
    <!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(std.code || "SIMRS")} — ${escapeHtml(std.title || "Laporan SIMRS")}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111827; padding: 28px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
          .code-badge { display: inline-block; padding: 3px 8px; border: 1px solid #111827; border-radius: 4px; font-weight: 700; font-size: 11px; margin-bottom: 6px; }
          .meta { display: flex; justify-content: space-between; background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px 14px; border-radius: 6px; margin-bottom: 18px; font-size: 12px; }
          .section { margin-bottom: 22px; page-break-inside: avoid; }
          h3 { margin: 0 0 8px; font-size: 14px; border-left: 4px solid #111827; padding-left: 8px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
          .kpi { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; }
          .kpi-label { font-size: 10px; color: #4b5563; text-transform: uppercase; font-weight: 600; }
          .kpi-val { font-size: 15px; font-weight: 700; margin: 3px 0; }
          .kpi-sub { font-size: 10px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
          th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .footer { margin-top: 32px; display: flex; justify-content: flex-end; }
          .sign-box { width: 240px; text-align: center; }
          .sign-space { height: 56px; }
          .no-print { margin-bottom: 16px; }
          @media print { .no-print { display: none; } body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button onclick="window.print()" style="padding:8px 14px;background:#111827;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Cetak / Simpan PDF</button>
        </div>
        <div class="header">
          <div>
            <h2 style="margin:0;font-size:18px;">RUMAH SAKIT SIMRS INOVA MEDIKA</h2>
            <p style="margin:3px 0 0;color:#4b5563;">Sistem Informasi Manajemen Rumah Sakit — Instalasi Rawat Jalan</p>
          </div>
          <div style="text-align:right;">
            <div class="code-badge">${escapeHtml(std.code || "SIMRS")}</div>
            <div style="font-weight:700;font-size:13px;">${escapeHtml(std.title || "Laporan SIMRS")}</div>
          </div>
        </div>
        <div class="meta">
          <div>
            <strong>Periode:</strong> ${escapeHtml(period.label || "-")}<br/>
            <strong>Rentang:</strong> ${escapeHtml(formatDate(period.from))} s/d ${escapeHtml(formatDate(period.to))}
          </div>
          <div style="text-align:right;">
            <strong>Filter Aktif:</strong> ${escapeHtml(filterText)}<br/>
            <strong>Dicetak:</strong> ${escapeHtml(formatDateTime(new Date().toISOString()))} oleh ${escapeHtml(user?.name || user?.email || "-")}
          </div>
        </div>
        ${bodyHtml || '<p style="text-align:center;color:#6b7280;">Tidak ada data laporan untuk ditampilkan.</p>'}
        <div class="footer">
          <div class="sign-box">
            <div>Mengetahui / Petugas Pelaporan,</div>
            <div class="sign-space"></div>
            <div style="border-top:1px solid #111827;padding-top:4px;font-weight:600;">${escapeHtml(user?.name || user?.email || "Penanggung Jawab SIMRS")}</div>
            <div style="font-size:11px;color:#4b5563;">${escapeHtml(user?.role?.display_name || user?.role?.name || "")}</div>
          </div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}
