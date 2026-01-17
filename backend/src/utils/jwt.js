import { SignJWT } from 'jose';

export async function generateToken(userId, secret) {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}
