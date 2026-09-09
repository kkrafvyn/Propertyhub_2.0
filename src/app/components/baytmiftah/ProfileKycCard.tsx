import { Link } from 'react-router';
import { ShieldCheck, ShieldAlert, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n/LocaleContext';
import { useMyKyc } from '../../hooks/useMyKyc';
import { isKycPending, isKycVerified } from '../../lib/baytmiftah/kyc';
import { CONSUMER_ROUTES } from '../../lib/consumer-routes';
import { Badge } from '../ui/badge';

export default function ProfileKycCard({ variant = 'mobile' }: { variant?: 'mobile' | 'desktop' }) {
  const { t } = useTranslation();
  const { kyc, loading, verified } = useMyKyc();

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface-subtle/50 p-5 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-2" />
        <div className="h-4 w-64 bg-muted/60 rounded" />
      </div>
    );
  }

  const isVerified = verified || isKycVerified(kyc);
  const pending = isKycPending(kyc);

  if (isVerified) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 dark:border-emerald-500/20 dark:from-emerald-950/40 dark:via-emerald-950/20 shadow-sm ${
          variant === 'mobile' ? 'shadow-bolt-card' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground tracking-tight">
                  {t('kycPage.verifiedTitle') || 'Identity Verified'}
                </p>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-medium text-[11px] gap-1 px-2 py-0.5">
                  <Sparkles className="w-3 h-3" />
                  Verified Resident
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
                {t('kycPage.verifiedBody') ||
                  'Your government identity was authenticated. Unrestricted access to offers, escrow, and verified leases.'}
              </p>
            </div>
          </div>
          <Link
            to={CONSUMER_ROUTES.kyc}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0 hidden sm:inline-flex items-center gap-1"
          >
            View Credential
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <Link
        to={CONSUMER_ROUTES.kyc}
        className={`group block relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 transition-all hover:border-amber-500/50 hover:shadow-md dark:border-amber-500/20 dark:from-amber-950/30 ${
          variant === 'mobile' ? 'shadow-bolt-card' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground tracking-tight">
                  {t('kycPage.pendingTitle') || 'Verification in Progress'}
                </p>
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                  Under Review
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
                {t('kycPage.pendingBody') ||
                  'Your documents are undergoing automated screening & compliance review. Typically approved in < 2 hours.'}
              </p>
              <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:underline">
                View status & audit progress
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={CONSUMER_ROUTES.kyc}
      className={`group block relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-surface-subtle to-transparent p-5 transition-all hover:border-primary/40 hover:shadow-md ${
        variant === 'mobile' ? 'shadow-bolt-card' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground tracking-tight">
                {t('profile.kycRequired') || 'Identity Verification Required'}
              </p>
              <Badge variant="destructive" className="text-[11px] font-medium">
                Required for Offers
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xl">
              {t('profile.kycRequiredDesc') ||
                'Verify your government identity and selfie to unlock instant bookings, lease signatures, and verified buyer status.'}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
              {t('kycPage.startVerification') || 'Start Identity Verification'}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
