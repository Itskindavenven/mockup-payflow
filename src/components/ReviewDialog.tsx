"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  BniTransaction,
  TransactionType,
  formatRupiah,
  getTypeLabel,
} from "@/lib/data";

interface ReviewDialogProps {
  transaction: BniTransaction | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, type: TransactionType, notes: string) => void;
  onSkip: (id: string) => void;
}

export function ReviewDialog({
  transaction,
  open,
  onClose,
  onSubmit,
  onSkip,
}: ReviewDialogProps) {
  const [type, setType] = useState<TransactionType>("unknown");
  const [notes, setNotes] = useState("");

  if (!transaction) return null;

  function handleSubmit() {
    if (!transaction) return;
    if (type === "unknown") {
      toast.error("Pilih jenis transaksi terlebih dahulu.");
      return;
    }
    onSubmit(transaction.id, type, notes);
    setType("unknown");
    setNotes("");
  }

  function handleSkip() {
    if (!transaction) return;
    onSkip(transaction.id);
    setType("unknown");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Transaksi Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md bg-gray-50 border p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span className="font-medium">{transaction.post_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jumlah</span>
              <span className="font-semibold text-red-600">
                − {formatRupiah(transaction.amount)}
              </span>
            </div>
            <Separator className="my-2" />
            <div>
              <span className="text-gray-500 block mb-1">Deskripsi</span>
              <span className="font-mono text-xs break-all">
                {transaction.description}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-type">Jenis Transaksi</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as TransactionType)}
            >
              <SelectTrigger id="tx-type">
                <SelectValue placeholder="Pilih jenis transaksi..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase_payment">
                  {getTypeLabel("purchase_payment")}
                </SelectItem>
                <SelectItem value="other_payment">
                  {getTypeLabel("other_payment")}
                </SelectItem>
                <SelectItem value="bank_transfer">
                  {getTypeLabel("bank_transfer")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Tambahkan keterangan jika diperlukan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Lewati
          </Button>
          <Button onClick={handleSubmit} aria-label="Tandai siap push ke Accurate">
            Tandai Siap Push
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
