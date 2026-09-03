import type { ReactNode } from "react";
import { DesktopShell } from "../baytmiftah/DesktopShell";

type StandalonePageShellProps = {
  children: ReactNode;
  maxWidthClassName?: string;
};

export function StandalonePageShell({
  children,
  maxWidthClassName = "max-w-3xl",
}: StandalonePageShellProps) {
  return (
    <DesktopShell minimal showFooter={false}>
      <div className={`mx-auto w-full ${maxWidthClassName}`}>{children}</div>
    </DesktopShell>
  );
}
