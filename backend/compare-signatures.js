import { createHash } from 'node:crypto';

// Exact encoding from your working app
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

// Test with afrodate data
const afrodateData = {
  merchant_id: '11744202',
  merchant_key: 'ezjv1jb199znm',
  return_url: 'https://afrodate.co.za/tokens?payment=success&id=test123',
  cancel_url: 'https://afrodate.co.za/tokens?payment=cancelled',
  notify_url: 'https://api.afrodate.co.za/api/payments/notify',
  name_first: 'User',
  name_last: 'Name',
  email_address: 'geraldrushway@gmail.com',
  amount: '500.00',
  item_name: '50 Tokens',
  item_description: '50 token(s) @ R10.00 per token',
  m_payment_id: 'test_payment_123',
};

// Test with prosdirectory data (working)
const prosdirectoryData = {
  merchant_id: '11744202',
  merchant_key: 'ezjv1jb199znm',
  return_url: 'https://prosdirectory.co.za/tokens/purchase?status=success',
  cancel_url: 'https://prosdirectory.co.za/tokens/purchase?status=cancelled',
  notify_url: 'https://api.prosdirectory.co.za/api/tokens/payfast/notify',
  name_first: 'Mercia',
  name_last: 'Claassen',
  email_address: 'mercia.claassen301@yahoo.com',
  amount: '270.00',
  item_name: '15 Tokens',
  item_description: '15 tokens for Professional Directory',
  m_payment_id: '1771109925981-1e4468d6-15',
};

console.log('Testing signature generation...\n');

console.log('PROSDIRECTORY (Working):');
const prosSig = generateSignature(prosdirectoryData);
console.log(`Generated: ${prosSig}`);
console.log(`Expected:  35f0227399f85a5b89cd1f3246a047e5`);
console.log(`Match: ${prosSig === '35f0227399f85a5b89cd1f3246a047e5' ? '✓ YES' : '✗ NO'}\n`);

console.log('AFRODATE (Not Working):');
const afroSig = generateSignature(afrodateData);
console.log(`Generated: ${afroSig}`);
console.log(`From logs: 75e5f022635afedba0e51a102a3b15cb`);
console.log(`Match: ${afroSig === '75e5f022635afedba0e51a102a3b15cb' ? '✓ YES' : '✗ NO'}\n`);

// Test if merchant_key might be different
console.log('Testing with potential merchant_key variations:\n');

const variations = [
  { name: 'As-is', key: 'ezjv1jb199znm' },
  { name: 'With space', key: 'ezjv1jb199znm ' },
  { name: 'With newline', key: 'ezjv1jb199znm\n' },
  { name: 'Different key', key: 'ezjv1jb199znm1' },
];

variations.forEach(({ name, key }) => {
  const testData = { ...afrodateData, merchant_key: key };
  const sig = generateSignature(testData);
  console.log(`${name}: ${sig}`);
});

console.log('\n');
console.log('If prosdirectory signature matches, the encoding is correct.');
console.log('If afrodate signature matches logs, your code is correct.');
console.log('The issue is likely in PayFast dashboard settings or merchant_key secret.');
