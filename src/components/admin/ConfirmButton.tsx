"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/admin/toast";
import type { ActionResult } from "@/lib/admin/context";
import { uz } from "@/lib/i18n/uz";

// A button that asks for confirmation in a dialog (Esc or "Bekor qilish" closes it), then runs
// a Server Action. `secondConfirm` adds a second question (used for permanent delete).
export function ConfirmButton({
  label,
  confirm,
  secondConfirm,
  action,
  className = "btn-secondary",
  children,
  danger = false,
}: {
  label: string;
  confirm?: string;
  secondConfirm?: string;
  action: () => Promise<ActionResult>;
  className?: string;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      const res = await action();
      dialogRef.current?.close();
      if (res.ok) {
        if (res.message) toast(res.message);
        router.refresh();
      } else toast(res.error, "error");
    });

  const open = () => {
    if (!confirm) return run();
    setStep(1);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button type="button" className={className} onClick={open} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {children ?? label}
      </button>
      {confirm ? (
        <dialog
          ref={dialogRef}
          className="m-auto w-[min(92vw,440px)] rounded-xl border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/40"
          aria-label={label}
        >
          <div className="p-6">
            <p className="font-semibold">{label}</p>
            <p className="mt-2 text-sm text-muted">{step === 1 ? confirm : secondConfirm}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => dialogRef.current?.close()} autoFocus>
                {uz.admin.common.cancel}
              </button>
              <button
                type="button"
                className={danger ? "btn-danger" : "btn-primary"}
                disabled={pending}
                onClick={() => (step === 1 && secondConfirm ? setStep(2) : run())}
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {uz.admin.common.confirm}
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
