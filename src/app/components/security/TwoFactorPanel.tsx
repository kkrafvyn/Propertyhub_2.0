import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export type AuthenticatorFactor = { id: string; friendly_name?: string };

export interface TwoFactorPanelProps {
  loading: boolean;
  error: string;
  factors: AuthenticatorFactor[];
  currentAal: string | null;
  needsStepUp: boolean;
  required: boolean;
  qrCode: string | null;
  secretKey: string | null;
  setupPending: boolean;
  verifyPending: boolean;
  cancelPending: boolean;
  code: string;
  onCodeChange: (code: string) => void;
  onStart: () => void;
  onVerify: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: (id: string) => void;
}

/** All enrollment and assurance checks remain in the owning security page. */
export function TwoFactorPanel(props: TwoFactorPanelProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const active = props.factors.length > 0;
  const settingUp = Boolean(props.qrCode || props.secretKey);
  const busy =
    props.loading ||
    props.setupPending ||
    props.verifyPending ||
    props.cancelPending;
  useEffect(() => {
    setShowSecret(false);
    setCopied(false);
    setCopyError("");
  }, [props.secretKey]);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(props.secretKey || "");
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError(
        "Copy is unavailable. Reveal the setup key and enter it in your authenticator app.",
      );
    }
  };

  return (
    <section
      aria-labelledby="two-factor-heading"
      className="overflow-hidden rounded-2xl border border-surface-border bg-surface"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-surface-border p-5 sm:p-7">
        <div className="flex max-w-xl gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2
              id="two-factor-heading"
              className="text-lg font-semibold text-ink"
            >
              Two-factor authentication
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
              Add an authenticator code after your password to protect your
              account.
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-surface-subtle text-ink-secondary"}`}
        >
          {props.loading
            ? "Checking status"
            : settingUp
              ? "Setup in progress"
              : props.error && !active
                ? "Status unavailable"
                : active
                  ? "Enabled"
                  : "Not enabled"}
        </span>
      </header>

      <div className="space-y-6 p-5 sm:p-7">
        {props.loading ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-ink-secondary"
          >
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Checking your authenticator and session…
          </p>
        ) : null}
        {props.error ? (
          <div
            role="alert"
            className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          >
            <p className="text-sm text-destructive">{props.error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={props.onRetry}
              disabled={busy}
            >
              Refresh security status
            </Button>
          </div>
        ) : null}

        {!props.loading && !props.error && !active && !settingUp ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Smartphone aria-hidden="true" className="h-4 w-4" />
              Authenticator app · no SMS needed
            </div>
            <ol className="space-y-4">
              {[
                [
                  "Get an authenticator",
                  "Use an authenticator app such as Google Authenticator or Microsoft Authenticator on your phone.",
                ],
                [
                  "Connect your account",
                  "Scan the QR code, or enter the setup key if you are using the same phone.",
                ],
                [
                  "Confirm a code",
                  "Enter the current six-digit code to finish. Protection starts only after verification.",
                ],
              ].map(([title, detail], index) => (
                <li key={title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-surface-border text-xs font-semibold text-ink"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{title}</p>
                    <p className="mt-1 text-sm text-ink-secondary">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button
              type="button"
              onClick={props.onStart}
              disabled={busy}
              className="min-h-11 w-full sm:w-auto"
            >
              {props.setupPending ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound aria-hidden="true" className="h-4 w-4" />
              )}
              {props.setupPending ? "Preparing setup…" : "Set up authenticator"}
            </Button>
          </>
        ) : null}

        {settingUp ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-ink">
                Connect your authenticator
              </h3>
              <p className="mt-1 text-sm text-ink-secondary">
                In your authenticator app, choose Add account, then scan this
                code. Keep the QR code and setup key private.
              </p>
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {props.qrCode ? (
                <div className="w-fit shrink-0 rounded-xl border border-surface-border bg-white p-3">
                  <img
                    src={props.qrCode}
                    alt="Scan this QR code with your authenticator app"
                    className="h-44 w-44"
                  />
                </div>
              ) : null}
              {props.secretKey ? (
                <div className="min-w-0 flex-1 space-y-3">
                  <h4 className="text-sm font-medium text-ink">
                    Setting up on this phone?
                  </h4>
                  <p className="text-sm text-ink-secondary">
                    Enter the setup key manually in your authenticator. Choose a
                    time-based account.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? "Hide setup key" : "Show setup key"}
                  </Button>
                  {showSecret ? (
                    <>
                      <code
                        className="block break-all rounded-lg border border-surface-border bg-surface-subtle p-3 font-mono text-sm text-ink"
                        aria-label="Authenticator setup key"
                      >
                        {props.secretKey}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void copySecret()}
                      >
                        {copied ? (
                          <Check aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <Copy aria-hidden="true" className="h-4 w-4" />
                        )}
                        {copied ? "Setup key copied" : "Copy setup key"}
                      </Button>
                    </>
                  ) : null}
                  {copyError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {copyError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {active && !settingUp && !props.loading ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-500/5 p-4">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              />
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Your authenticator is connected
                </h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  {props.currentAal === "aal2"
                    ? "This session has passed two-factor verification."
                    : "Enter a current authenticator code when a protected area asks you to verify."}
                </p>
              </div>
            </div>
            {!props.needsStepUp
              ? props.factors.map((factor) => (
                  <div
                    key={factor.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border pt-4"
                  >
                    <span className="text-sm text-ink">
                      {factor.friendly_name || "Authenticator app"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => props.onRemove(factor.id)}
                    >
                      Remove authenticator
                    </Button>
                  </div>
                ))
              : null}
          </div>
        ) : null}

        {(settingUp || props.needsStepUp) && !props.loading ? (
          <form
            className="space-y-4 border-t border-surface-border pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy && /^\d{6}$/.test(props.code)) props.onVerify();
            }}
          >
            <div>
              <h3 className="font-semibold text-ink">
                {settingUp
                  ? "Verify and enable protection"
                  : "Verify this session"}
              </h3>
              <p
                id="authenticator-code-help"
                className="mt-1 text-sm text-ink-secondary"
              >
                Enter the six-digit code shown in your authenticator app. This
                code is not sent by SMS.
              </p>
            </div>
            <div className="max-w-xs">
              <Input
                id="authenticator-code"
                label="Six-digit authenticator code"
                aria-describedby="authenticator-code-help"
                value={props.code}
                onChange={(event) =>
                  props.onCodeChange(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCapitalize="off"
                spellCheck={false}
                disabled={busy}
                className="font-mono text-xl tracking-[0.35em]"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={busy || !/^\d{6}$/.test(props.code)}
                className="min-h-11"
              >
                {props.verifyPending ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : null}
                {props.verifyPending
                  ? "Verifying…"
                  : settingUp
                    ? "Verify and enable"
                    : "Verify and continue"}
              </Button>
              {settingUp ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={props.onCancel}
                >
                  {props.cancelPending ? "Cancelling…" : "Cancel setup"}
                </Button>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed text-ink-muted">
              If a code expires, wait for a new one and try again. Enable
              automatic date and time on your phone if codes keep failing.
            </p>
          </form>
        ) : null}
        {!props.loading ? (
          <p className="border-t border-surface-border pt-4 text-xs leading-relaxed text-ink-muted">
            {props.required
              ? "Two-factor verification is required to enter this protected area. "
              : ""}
            Authenticator codes work without SMS delivery or a phone-number
            verification service. Keep access to your authenticator before
            changing devices.
          </p>
        ) : null}
      </div>
    </section>
  );
}
