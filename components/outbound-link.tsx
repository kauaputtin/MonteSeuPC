"use client";

import type { AnchorHTMLAttributes } from "react";

export function OutboundLink({ offerId, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { offerId: string }) {
  return <a {...props} target="_blank" rel="noopener noreferrer sponsored" onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented) void fetch("/api/outbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId }), keepalive: true }).catch(() => undefined);
  }} />;
}
