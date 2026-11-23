/**
 * Consumer accounts are usable before KYC. Verification is requested
 * progressively, not imposed as a registration or marketplace entry gate.
 *
 * This reminder is NOT an authorization check. Sensitive transactions must
 * continue to use server-side, jurisdiction-specific KYC requirements.
 */
export const CONSUMER_KYC_REMINDER_AFTER_DAYS = 7;

export function shouldShowConsumerKycReminder(input: {
  accountCreatedAt?: string | null;
  kycVerified?: boolean;
  now?: Date;
}): boolean {
  if (input.kycVerified || !input.accountCreatedAt) return false;
  const created = Date.parse(input.accountCreatedAt);
  const now = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(now) || created > now) return false;
  return now - created >= CONSUMER_KYC_REMINDER_AFTER_DAYS * 24 * 60 * 60 * 1000;
}
