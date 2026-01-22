// Email verification utilities
export function generateVerificationToken() {
  return crypto.randomUUID();
}

export function getVerificationExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours
  return expiry.toISOString();
}

export function generateResetToken() {
  return crypto.randomUUID();
}

export function getResetExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour
  return expiry.toISOString();
}

export async function sendVerificationEmail(email, token, env) {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  
  console.log(`[Email] Verification email for ${email}:`);
  console.log(`[Email] Verification URL: ${verificationUrl}`);
  
  return true;
}

export async function sendPasswordResetEmail(email, token, env) {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  
  console.log(`[Email] Password reset email for ${email}:`);
  console.log(`[Email] Reset URL: ${resetUrl}`);
  
  return true;
}