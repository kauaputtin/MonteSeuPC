"use client";

import type { AnchorHTMLAttributes } from "react";

type TrackingTarget = { offerId: string; offerSourceId?: never } | { offerId?: never; offerSourceId: string };

export function OutboundLink({ offerId, offerSourceId, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & TrackingTarget) {
  return <a {...props} target="_blank" rel="noopener noreferrer sponsored" onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented) void fetch("/api/outbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(offerId ? { offerId } : { offerSourceId }), keepalive: true }).catch(() => undefined);
  }} />;
}
