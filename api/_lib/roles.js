// Shared role / status enums for the auth foundation.
export const COMPANY_TYPES = ['buyer', 'supplier', 'both'];
export const MEMBERSHIP_ROLES = ['owner', 'admin', 'procurement_manager', 'sales_manager', 'viewer'];
export const USER_STATUS = ['active', 'disabled', 'pending'];
export const VERIFICATION_STATUS = ['unverified', 'pending', 'verified', 'rejected'];

export function isValidCompanyType(t) {
  return COMPANY_TYPES.includes(t);
}
export function isValidMembershipRole(r) {
  return MEMBERSHIP_ROLES.includes(r);
}
