import { createHash } from 'node:crypto';

// Test with exact data from your logs
const testData = {
  merchant_id: '11744202',
  merchant_key: 'ezjv1jb199znm',
  return_url: 'https://afrodate.co.za/tokens?payment=success&id=f7a9c8c8-f6ec-4ad3-b4b9-f39e1905b572',
  cancel_url: 'https://afrodate.co.za/tokens?payment=cancelled',
  notify_url: 'https://api.afrodate.co.za/api/payments/notify',
  name_first: 'User',
  name_last: 'Name',
  email_address: 'geraldrushway@gmail.com',
  amount: '500.00',
  item_name: '50 Tokens',
  item_description: '50 token(s) @ R10.00 per token',
  m_payment_id: 'f7a9c8c8-f6ec-4ad3-b4b9-f39e1905b572',
};

const encodeValue = (value) => {
  return encodeURIComponent(String(value))
    .replace(/%20/g, '+')
    .replace(/%2D/g, '-')
    .replace(/%5F/g, '_')
    .replace(/%2E/g, '.')
    .replace(/%7E/g, '~');
};

function generateSignature(data, passphrase = '') {
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

console.log('Testing merchant_key variations:\n');

const variations = [
  { name: 'merchant_key as-is', key: 'ezjv1jb199znm', pass: 'Rejoice-2014' },
  { name: 'merchant_key with space', key: 'ezjv1jb199znm ', pass: 'Rejoice-2014' },
  { name: 'merchant_key with newline', key: 'ezjv1jb199znm\n', pass: 'Rejoice-2014' },
  { name: 'passphrase with space', key: 'ezjv1jb199znm', pass: 'Rejoice-2014 ' },
  { name: 'passphrase with newline', key: 'ezjv1jb199znm', pass: 'Rejoice-2014\n' },
  { name: 'Both with newline', key: 'ezjv1jb199znm\n', pass: 'Rejoice-2014\n' },
];

const expected = '531094f6e7014189d2b84701c7c30b7b';

variations.forEach(({ name, key, pass }) => {
  const testDataCopy = { ...testData, merchant_key: key };
  const sig = generateSignature(testDataCopy, pass);
  const match = sig === expected ? '✓ MATCH!' : '';
  console.log(`${name}:`);
  console.log(`  ${sig} ${match}`);
});

console.log(`\nExpected: ${expected}`);
