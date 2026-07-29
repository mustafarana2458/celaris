"use client";

import QRCode from "react-qr-code";

export function InvoiceQrCode({ value, size = 96 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div className="rounded-lg border border-slate-200 bg-white p-2">
        <QRCode value={value} size={size} />
      </div>
    </div>
  );
}
