/**
 * PayFast Signature Test Script
 * 
 * Run this to test your PayFast signature generation locally
 * Usage: node test-payfast-signature.js
 */

import { createHash } from 'node:crypto';

// ============ CONFIGURATION ============
// Replace these with your actual values from .dev.vars or wrangler secrets
const CONFIG = {
  MERCHANT_ID: 'YOUR_MERCHANT_ID',
  MERCHANT_KEY: 'YOUR_MERCHANT_KEY',
  PASSPHRASE: 'YOUR_PASSPHRASE', // Leave empty if not using passphrase
  MODE: 'sandbox', // or 'live'
};

// ============ HELPER FUNCTIONS ============
const encodeValue = (value) => {
  return encodeURIComponent(String(value))
    .replace(/%20/g, '+')
    .replace(/%2D/g, '-')
    .replace(/%5F/g, '_')
    .replace(/%2E/g, '.')
    .replace(/%7E/g, '~');
};

function generateSignature(data, passphrase) {
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

// ============ TEST DATA ============
const testPaymentData = {
  merchant_id: CONFIG.MERCHANT_ID,
  merchant_key: CONFIG.MERCHANT_KEY,
  return_url: 'https://afrodate.co.za/tokens?payment=success&id=test123',
  cancel_url: 'https://afrodate.co.za/tokens?payment=cancelled',
  notify_url: 'https://api.afrodate.co.za/api/payments/notify',
  name_first: 'Test',
  name_last: 'User',
  email_address: 'test@example.com',
  amount: '50.00',
  item_name: '100 Tokens',
  item_description: '100 token(s) @ R0.50 per token',
  m_payment_id: 'test_payment_123',
};

// ============ RUN TESTS ============
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         PayFast Signature Generation Test                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Configuration:');
console.log(`  Mode: ${CONFIG.MODE}`);
console.log(`  Merchant ID: ${CONFIG.MERCHANT_ID}`);
console.log(`  Merchant Key: ${CONFIG.MERCHANT_KEY ? '***' + CONFIG.MERCHANT_KEY.slice(-4) : 'NOT SET'}`);
console.log(`  Passphrase: ${CONFIG.PASSPHRASE ? '***' + CONFIG.PASSPHRASE.slice(-4) : 'NOT SET'}`);
console.log('');

// Check for common issues
console.log('Pre-flight checks:');
const issues = [];

if (!CONFIG.MERCHANT_ID || CONFIG.MERCHANT_ID === 'YOUR_MERCHANT_ID') {
  issues.push('❌ MERCHANT_ID not configured');
} else {
  console.log('  ✓ Merchant ID configured');
}

if (!CONFIG.MERCHANT_KEY || CONFIG.MERCHANT_KEY === 'YOUR_MERCHANT_KEY') {
  issues.push('❌ MERCHANT_KEY not configured');
} else {
  console.log('  ✓ Merchant Key configured');
}

if (CONFIG.PASSPHRASE && CONFIG.PASSPHRASE !== 'YOUR_PASSPHRASE') {
  console.log('  ✓ Passphrase configured');
  
  if (CONFIG.PASSPHRASE !== CONFIG.PASSPHRASE.trim()) {
    issues.push('⚠️  WARNING: Passphrase has leading/trailing whitespace');
  }
  
  if (CONFIG.PASSPHRASE.includes('\n') || CONFIG.PASSPHRASE.includes('\r')) {
    issues.push('⚠️  WARNING: Passphrase contains newline characters');
  }
  
  if (CONFIG.PASSPHRASE.length < 10) {
    issues.push('⚠️  WARNING: Passphrase seems too short (< 10 chars)');
  }
} else {
  console.log('  ℹ  No passphrase configured (optional)');
}

console.log('');

if (issues.length > 0) {
  console.log('Issues found:');
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log('');
}

// Generate signature
console.log('Generating signature...\n');

console.log('Step 1: Sort parameters alphabetically');
const sortedKeys = Object.keys(testPaymentData).sort();
console.log(`  ${sortedKeys.join(', ')}\n`);

console.log('Step 2: Build parameter string');
const pairs = sortedKeys.map((key) => {
  const value = testPaymentData[key];
  const encoded = encodeValue(value);
  return `${key}=${encoded}`;
});
const paramString = pairs.join('&');
console.log(`  ${paramString}\n`);

console.log('Step 3: Add passphrase (if configured)');
const finalString = CONFIG.PASSPHRASE && CONFIG.PASSPHRASE.trim()
  ? `${paramString}&passphrase=${encodeValue(CONFIG.PASSPHRASE)}`
  : paramString;
console.log(`  ${finalString.replace(/passphrase=[^&]+/, 'passphrase=***')}\n`);

console.log('Step 4: Generate MD5 hash');
const signature = generateSignature(testPaymentData, CONFIG.PASSPHRASE);
console.log(`  ${signature}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('RESULT:');
console.log(`  Signature: ${signature}`);
console.log('═══════════════════════════════════════════════════════════\n');

// Test variations
console.log('Testing common variations:\n');

const variations = [
  { name: 'Without passphrase', pass: '' },
  { name: 'With passphrase', pass: CONFIG.PASSPHRASE },
  { name: 'With trimmed passphrase', pass: CONFIG.PASSPHRASE?.trim() },
];

variations.forEach(({ name, pass }) => {
  if (pass === undefined) return;
  const sig = generateSignature(testPaymentData, pass);
  console.log(`  ${name}:`);
  console.log(`    ${sig}`);
});

console.log('\n');
console.log('Next steps:');
console.log('  1. Update CONFIG values in this script with your actual credentials');
console.log('  2. Run: node test-payfast-signature.js');
console.log('  3. Compare generated signature with PayFast dashboard test');
console.log('  4. Enable PAYFAST_SIGNATURE_DEBUG=true in your .dev.vars');
console.log('  5. Check Cloudflare Workers logs for detailed signature debug output');
console.log('');
