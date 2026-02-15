import { createHash, timingSafeEqual } from 'node:crypto';

const encodeValue = (value) => {
  // PayFast uses PHP urlencode which is equivalent to encodeURIComponent
  // but with spaces as '+' instead of '%20'
  // This matches PHP's urlencode() exactly
  return encodeURIComponent(String(value).trim()).replace(/%20/g, '+');
};

export function generateSignature(data, passphrase) {
  // IMPORTANT: PayFast requires parameters in the EXACT order they are defined
  // NOT alphabetical order (that's only for API calls)
  // Order: merchant_id, merchant_key, return_url, cancel_url, notify_url,
  //        name_first, name_last, email_address, amount, item_name, item_description, m_payment_id
  
  const orderedKeys = [
    'merchant_id',
    'merchant_key', 
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'amount',
    'item_name',
    'item_description',
    'm_payment_id'
  ];
  
  const payload = orderedKeys
    .filter((key) => {
      const val = data[key];
      return val !== undefined && val !== null && val !== '';
    })
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

  // ITN uses alphabetical order (different from payment form)
  const payload = Object.keys(data)
    .sort()
    .filter((key) => {
      const val = data[key];
      return val !== undefined && val !== null && val !== '';
    })
    .map((key) => `${key}=${encodeValue(data[key])}`)
    .join('&');

  const base = passphrase && passphrase.trim()
    ? `${payload}&passphrase=${encodeValue(passphrase)}`
    : payload;

  const expected = createHash('md5').update(base).digest('hex');
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
