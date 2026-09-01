/**
 * @deprecated Prefer `bankReconciliationService` from `./bank-reconciliation.service`.
 * Kept for backward compatibility — uses `bank_feed_connections` schema.
 */
export {
  bankReconciliationService as bankFeedService,
  type BankFeedConnection,
} from "./bank-reconciliation.service";
