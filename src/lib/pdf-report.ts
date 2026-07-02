import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { JournalGroup, AccurateStatus } from "@/lib/parser";
import { formatRupiah, cleanDescription } from "@/lib/parser";

const STATUS_LABEL: Record<AccurateStatus, string> = {
  sudah_tercatat: "Sudah di Accurate",
  akan_dipush: "Akan di-push",
  perlu_review: "Perlu Review",
};

export interface ApReportMeta {
  fileName: string;
  databaseName: string;
  kasBankName: string;
  createdAt: string;
  status: "draft" | "selesai";
  createdByName: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function generateApReportPdf(meta: ApReportMeta, groups: JournalGroup[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // ─── Header ──────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Transaksi AP", margin, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("PT Ega Accurate Indonesia - BNI e-Statement -> Accurate Online", margin, 22);

  const infoLines = [
    ["Database", meta.databaseName],
    ["Rekening Kas/Bank", meta.kasBankName],
    ["File Sumber", meta.fileName],
    ["Dibuat oleh", meta.createdByName],
    ["Tanggal Sesi", formatDate(meta.createdAt)],
    ["Status Sesi", meta.status === "selesai" ? "Selesai" : "Draft"],
  ];
  let infoY = 30;
  doc.setFontSize(8.5);
  infoLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, infoY);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 35, infoY);
    infoY += 5;
  });

  // ─── Ringkasan ───────────────────────────────────────────────────────────
  const totalDebit = groups.filter((g) => g.db_cr === "D").reduce((s, g) => s + g.total_debit, 0);
  const counts = {
    total: groups.length,
    sudah: groups.filter((g) => g.accurate_status === "sudah_tercatat").length,
    akan: groups.filter((g) => g.accurate_status === "akan_dipush").length,
    review: groups.filter((g) => g.accurate_status === "perlu_review").length,
  };

  const summaryX = pageWidth - margin - 90;
  let summaryY = 30;
  const summaryRows: [string, string][] = [
    ["Total Jurnal", String(counts.total)],
    ["Sudah di Accurate", String(counts.sudah)],
    ["Akan di-push", String(counts.akan)],
    ["Perlu Review", String(counts.review)],
    ["Total Nominal Debit", formatRupiah(totalDebit)],
  ];
  doc.setFontSize(8.5);
  summaryRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, summaryX, summaryY);
    doc.setFont("helvetica", "normal");
    doc.text(value, summaryX + 45, summaryY);
    summaryY += 5;
  });

  // ─── Tabel transaksi ─────────────────────────────────────────────────────
  const body = groups.flatMap((g) =>
    g.rows.map((r) => [
      g.journal_no,
      formatDateShort(r.post_date),
      cleanDescription(r.description_raw),
      r.suggested_coa ?? "-",
      r.db_cr === "D" ? formatRupiah(r.amount) : "",
      r.db_cr === "C" ? formatRupiah(r.amount) : "",
      STATUS_LABEL[g.accurate_status],
    ])
  );

  autoTable(doc, {
    startY: Math.max(infoY, summaryY) + 4,
    head: [["No. Jurnal", "Tanggal", "Keterangan", "COA", "Debit", "Kredit", "Status"]],
    body,
    styles: { fontSize: 7.5, cellPadding: 1.6 },
    headStyles: { fillColor: [15, 30, 90], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20 },
      4: { halign: "right", cellWidth: 26 },
      5: { halign: "right", cellWidth: 26 },
      6: { cellWidth: 26 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Dicetak ${new Date().toLocaleString("id-ID")} · Halaman ${doc.getCurrentPageInfo().pageNumber}/${pageCount}`,
        margin,
        doc.internal.pageSize.getHeight() - 6
      );
    },
  });

  const safeFileBase = meta.fileName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "_");
  doc.save(`Laporan_AP_${safeFileBase}.pdf`);
}
