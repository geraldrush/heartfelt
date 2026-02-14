import { createHash, timingSafeEqual } from 'node:crypto';

const encodeValue = (value) => {
  // PayFast requires specific encoding: spaces as '+', but preserve other special chars
  return String(value).replace(/ /g, '+');
};

export function generateSignature(data, passphrase) {
  // PayFast requires parameters in alphabetical order
  const payload = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
    .map((key) => `${key}=${encodeValue(data[key])}`)
    .join('&');

  const base = passphrase && passphrase.trim()
    ? `${payload}&passphrase=${encodeValue(passphrase)}`
    : payload;

  return createHash('md5').update(base).digest('hex');
}

export function buildSignaturePayload(data, passphrase, options = {}) {
  const { maskPassphrase = false, maskEmail = false } = options;
  const payload = Object.keys(data)
    .sort()
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
    .map((key) => {
      let value = data[key];
      if (maskEmail && key === 'email_address') {
        value = '***';
      }
      return `${key}=${encodeValue(value)}`;
    })
    .join('&');

  if (!passphrase) {
    return payload;
  }
  const passphraseValue = maskPassphrase ? '***' : passphrase;
  return `${payload}&passphrase=${encodeValue(passphraseValue)}`;
}

export function verifySignature(data, receivedSignature, passphrase) {
  if (!receivedSignature) {
    return false;
  }

  const expected = generateSignature(data, passphrase);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function getPayfastUrl(env) {
  const mode = (env.PAYFAST_MODE || 'sandbox').toLowerCase();
  const sandboxUrl = env.PAYFAST_SANDBOX_URL || 'https://sandbox.payfast.co.za/eng/process';
  const liveUrl = env.PAYFAST_LIVE_URL || 'https://www.payfast.co.za/eng/process';
  return mode === 'live' ? liveUrl : sandboxUrl;
}

export function validateItnSource(_request) {
  return true;
}
