"use client";

import { useState } from "react";
import { refundOrder } from "@/app/admin/(panel)/actions/sales";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { uz } from "@/lib/i18n/uz";

export function RefundButton({ orderId, pending }: { orderId: string; pending: boolean }) {
  const [note, setNote] = useState("");
  const t = uz.admin.orders;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-60 flex-1">
        <label htmlFor="refund-note" className="label">
          {t.refundNote}
        </label>
        <input id="refund-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </div>
      <ConfirmButton
        label={pending ? t.cancelPending : t.refund}
        confirm={t.refundConfirm}
        action={() => refundOrder(orderId, note)}
        className="btn-danger"
        danger
      />
    </div>
  );
}
