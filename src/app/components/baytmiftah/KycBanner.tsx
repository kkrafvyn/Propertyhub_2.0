import { useState } from 'react';
import { Link } from 'react-router';
import { ShieldAlert, Clock, ArrowRight, X } from 'lucide-react';
import { useTranslation } from '../../i18n/LocaleContext';
import { isKycPending, isKycVerified } from '../../lib/baytmiftah/kyc';
import { CONSUMER_ROUTES } from '../../lib/consumer-routes';
import { Button } from '../ui/Button';

export default function KycBanner({ kyc, mode = 'transaction' }: {
  kyc?: any;
  mode?: 'reminder' | 'transaction';
}) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || isKycVerified(kyc)) return null;

  const pending = isKycPending(kyc);

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-2xl border p-4.5 transition-all shadow-xs ${
        pending
          ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-foreground dark:border-amber-500/20 dark:from-amber-950/40'
          : 'border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-foreground dark:border-primary/20 dark:from-primary/15'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
              pending
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30'
                : 'bg-primary/15 text-primary ring-primary/25'
            }`}
          >
            {pending ? (
              <Clock className="h-5 w-5 animate-pulse" />
            ) : (
              <ShieldAlert className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm sm:text-base tracking-tight text-foreground">
                {pending
                  ? t('kycPage.pendingTitle') || 'Identity Verification Under Review'
                  : mode === 'reminder'
                    ? 'Verify your identity when you are ready'
                    : 'Identity verification for this step'}
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  pending
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {pending ? 'In Progress' : mode === 'reminder' ? 'Later' : 'Action needed'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {pending
                ? 'Your identity verification is under review. You can continue using the marketplace while it is being checked.'
                : mode === 'reminder'
                  ? 'You can browse, save, enquire and message without KYC. Verify later when you reach a booking, formal offer, lease signing or another transaction that requires it.'
                  : 'You can continue browsing and enquiring. Verification is needed to complete this regulated booking, offer or agreement.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link to={CONSUMER_ROUTES.kyc}>
                <Button size="sm" variant={pending ? 'outline' : 'default'} className="gap-1.5 text-xs font-semibold">
                  {pending ? 'View Verification Progress' : mode === 'reminder' ? 'Verify identity' : 'Start identity verification'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
