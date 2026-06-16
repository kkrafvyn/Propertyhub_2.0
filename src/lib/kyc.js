export function isKycVerified(record) {
  return record?.status === 'verified'
}

export function isKycPending(record) {
  return record?.status === 'pending_review'
}

export function canSubmitOffer(kycRecord) {
  return isKycVerified(kycRecord)
}
