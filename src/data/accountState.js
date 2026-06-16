// Global account state - simulates logged in user account type
export const accountState = {
  current: 'buyer', // 'buyer' | 'seller' | 'both'
  set(type) { this.current = type; },
};
