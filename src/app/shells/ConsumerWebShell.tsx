import React, { type ReactNode } from "react";
import { DesktopShell } from "../components/baytmiftah/DesktopShell";

/**
 * Surface 1: Consumer Web Shell
 * ─────────────────────────────
 * Complete consumer property discovery & lifecycle experience in a browser:
 * Marketplace, Search, Detail, Compare, Saved, Bookings, Payments, Leases.
 */
export interface ConsumerWebShellProps {
  children: ReactNode;
  search?: ReactNode;
  categoryBar?: ReactNode;
  minimal?: boolean;
  fullBleed?: boolean;
  compareCount?: number;
  showFooter?: boolean;
}

export function ConsumerWebShell(props: ConsumerWebShellProps) {
  return <DesktopShell {...props} />;
}
