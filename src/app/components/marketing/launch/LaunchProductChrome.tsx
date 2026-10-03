import type { ReactNode } from "react";

/** Marketing compositions styled with workspace semantic tokens — illustrative data only. */

const NOTE = "Illustrative interface preview";

export function LaunchUiShell({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mk-l-ui-shell ${className}`.trim()} aria-hidden="true">
      <div className="mk-l-ui-shell__chrome">
        <span className="mk-l-ui-shell__dots" />
        <span className="mk-l-ui-shell__title">{title}</span>
      </div>
      <div className="mk-l-ui-shell__body">{children}</div>
      <p className="mk-l-ui-shell__note">{NOTE}</p>
    </div>
  );
}

export function LaunchMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mk-l-metric">
      <span className="mk-l-metric__label">{label}</span>
      <strong className="mk-l-metric__value">{value}</strong>
    </div>
  );
}

export function LaunchTableRow({ left, right }: { left: string; right: string }) {
  return (
    <div className="mk-l-row">
      <span>{left}</span>
      <em>{right}</em>
    </div>
  );
}
