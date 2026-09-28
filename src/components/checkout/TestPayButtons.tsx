"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { testPay } from "@/app/(site)/tolov/actions";
import { uz } from "@/lib/i18n/uz";

export function TestPayButtons({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (success: boolean) =>
    start(async () => {
      await testPay(orderId, success);
      router.push(`/tolov/natija/${orderId}`);
    });
  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className="btn-primary" disabled={pending} onClick={() => go(true)}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {uz.testPay.pay}
      </button>
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => go(false)}>
        {uz.testPay.cancel}
      </button>
    </div>
  );
}
