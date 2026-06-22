export function isKycVerified(record) {
  return record?.status === 'verified'
}

export function isKycPending(record) {
  return record?.status === 'pending_review' || record?.status === 'pending_provider'
}

export function canSubmitOffer(kycRecord) {
  return isKycVerified(kycRecord)
}
