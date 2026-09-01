import React, { type ReactNode } from "react";
import MobileShell from "../components/baytmiftah/MobileShell";

/**
 * Surface 2: Consumer Mobile Shell
 * ────────────────────────────────
 * Lightweight, everyday property interaction on iOS / Android / Mobile Web:
 * Explore · Search · Saved · Messages · Profile.
 * No heavy enterprise ERP clutter.
 */
export interface ConsumerMobileShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function ConsumerMobileShell(props: ConsumerMobileShellProps) {
  return <MobileShell {...props} />;
}
