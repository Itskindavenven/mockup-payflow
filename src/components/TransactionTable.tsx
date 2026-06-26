"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BniTransaction,
  TransactionStatus,
  formatRupiah,
  getStatusLabel,
  getTypeLabel,
} from "@/lib/data";

const STATUS_VARIANT: Record<
  TransactionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  sudah_di_accurate: "secondary",
  akan_dipush: "default",
  perlu_review: "outline",
};

const STATUS_CLASS: Record<TransactionStatus, string> = {
  sudah_di_accurate: "bg-green-100 text-green-800 border-green-200",
  akan_dipush: "bg-blue-100 text-blue-800 border-blue-200",
  perlu_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

interface TransactionTableProps {
  transactions: BniTransaction[];
  onReview: (tx: BniTransaction) => void;
  onPush: (id: string) => void;
  pushedIds: Set<string>;
  pushing: string | null;
}

export function TransactionTable({
  transactions,
  onReview,
  onPush,
  pushedIds,
  pushing,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        Tidak ada transaksi yang cocok dengan filter ini.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-28">Tanggal</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Deteksi</TableHead>
            <TableHead className="text-right w-36">Jumlah</TableHead>
            <TableHead className="w-40">Status</TableHead>
            <TableHead className="w-36 text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const isPushed = pushedIds.has(tx.id);
            const isPushing = pushing === tx.id;
            return (
              <TableRow key={tx.id} className="align-top">
                <TableCell className="text-sm text-gray-500 whitespace-nowrap pt-3">
                  {tx.post_date}
                </TableCell>
                <TableCell className="text-sm max-w-xs">
                  <span className="font-mono text-xs text-gray-700 break-all">
                    {tx.description}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {tx.detected_invoice && (
                    <div className="space-y-0.5">
                      <div className="text-xs text-gray-400">Invoice</div>
                      <div className="font-mono text-xs text-indigo-700">
                        {tx.detected_invoice}
                      </div>
                      {tx.detected_vendor && (
                        <div className="text-xs text-gray-600">
                          {tx.detected_vendor}
                        </div>
                      )}
                    </div>
                  )}
                  {tx.detected_keyword && (
                    <div className="space-y-0.5">
                      <div className="text-xs text-gray-400">Keyword</div>
                      <div className="text-xs text-orange-700 font-medium capitalize">
                        {tx.detected_keyword}
                      </div>
                    </div>
                  )}
                  {!tx.detected_invoice && !tx.detected_keyword && (
                    <span className="text-xs text-gray-300 italic">
                      Tidak terdeteksi
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-red-600 whitespace-nowrap pt-3">
                  − {formatRupiah(tx.amount)}
                </TableCell>
                <TableCell className="pt-3">
                  <div className="space-y-1">
                    <Badge
                      variant={STATUS_VARIANT[tx.status]}
                      className={`text-xs ${STATUS_CLASS[tx.status]}`}
                    >
                      {getStatusLabel(isPushed ? "sudah_di_accurate" : tx.status)}
                    </Badge>
                    <div className="text-xs text-gray-400">
                      {getTypeLabel(tx.suggested_type)}
                    </div>
                  </div>
                  {tx.accurate_ref && (
                    <div className="text-xs text-gray-400 mt-1">
                      Ref: {tx.accurate_ref}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center pt-2.5">
                  {tx.status === "perlu_review" && !isPushed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReview(tx)}
                      className="text-xs h-7"
                      aria-label={`Review transaksi ${tx.id}`}
                    >
                      Review
                    </Button>
                  )}
                  {tx.status === "akan_dipush" && !isPushed && (
                    <Button
                      size="sm"
                      onClick={() => onPush(tx.id)}
                      disabled={isPushing}
                      className="text-xs h-7"
                      aria-label={`Push transaksi ${tx.id} ke Accurate`}
                    >
                      {isPushing ? "Memproses..." : "Push"}
                    </Button>
                  )}
                  {(isPushed || tx.status === "sudah_di_accurate") && (
                    <span className="text-xs text-green-600 font-medium">✓ Selesai</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
