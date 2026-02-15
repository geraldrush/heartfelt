/**
 * PayFast Signature Test Script (Auto-loads from .dev.vars)
 * 
 * Usage: node test-payfast-auto.js
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .dev.vars
function loadDevVars() {
  try {
    const content = readFileSync(join(__dirname, '.dev.vars'), 'utf-8');
    const vars = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          vars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return vars;
  } catch (error) {
    console.error('Error reading .dev.vars:', error.message);
    return {};
  }
}

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

// Load config
const vars = loadDevVars();
const CONFIG = {
  MERCHANT_ID: vars.PAYFAST_MERCHANT_ID || '',
  MERCHANT_KEY: vars.PAYFAST_MERCHANT_KEY || '',
  PASSPHRASE: vars.PAYFAST_PASSPHRASE || '',
  MODE: vars.PAYFAST_MODE || 'sandbox',
};

// Test data
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

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║    PayFast Signature Test (Auto-loaded from .dev.vars)    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Configuration loaded from .dev.vars:');
console.log(`  Mode: ${CONFIG.MODE}`);
console.log(`  Merchant ID: ${CONFIG.MERCHANT_ID || 'NOT SET'}`);
console.log(`  Merchant Key: ${CONFIG.MERCHANT_KEY ? '***' + CONFIG.MERCHANT_KEY.slice(-4) : 'NOT SET'}`);
console.log(`  Passphrase: ${CONFIG.PASSPHRASE ? '***' + CONFIG.PASSPHRASE.slice(-4) + ` (${CONFIG.PASSPHRASE.length} chars)` : 'NOT SET'}`);
console.log('');

// Validation
const issues = [];

if (!CONFIG.MERCHANT_ID) {
  issues.push('❌ PAYFAST_MERCHANT_ID not set in .dev.vars');
} else {
  console.log('  ✓ Merchant ID configured');
}

if (!CONFIG.MERCHANT_KEY) {
  issues.push('❌ PAYFAST_MERCHANT_KEY not set in .dev.vars');
} else {
  console.log('  ✓ Merchant Key configured');
}

if (CONFIG.PASSPHRASE) {
  console.log('  ✓ Passphrase configured');
  
  if (CONFIG.PASSPHRASE !== CONFIG.PASSPHRASE.trim()) {
    issues.push('⚠️  WARNING: Passphrase has leading/trailing whitespace!');
    console.log(`    Original length: ${CONFIG.PASSPHRASE.length}`);
    console.log(`    Trimmed length: ${CONFIG.PASSPHRASE.trim().length}`);
  }
  
  if (CONFIG.PASSPHRASE.includes('\n')) {
    issues.push('⚠️  WARNING: Passphrase contains newline (\\n)!');
  }
  
  if (CONFIG.PASSPHRASE.includes('\r')) {
    issues.push('⚠️  WARNING: Passphrase contains carriage return (\\r)!');
  }
} else {
  console.log('  ℹ  No passphrase (optional)');
}

console.log('');

if (issues.length > 0) {
  console.log('⚠️  ISSUES FOUND:');
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log('');
}

if (!CONFIG.MERCHANT_ID || !CONFIG.MERCHANT_KEY) {
  console.log('❌ Cannot generate signature without credentials.');
  console.log('\nPlease set in .dev.vars:');
  console.log('  PAYFAST_MERCHANT_ID=your_merchant_id');
  console.log('  PAYFAST_MERCHANT_KEY=your_merchant_key');
  console.log('  PAYFAST_PASSPHRASE=your_passphrase  # Optional\n');
  process.exit(1);
}

// Generate signature
console.log('═══════════════════════════════════════════════════════════');
console.log('SIGNATURE GENERATION:');
console.log('═══════════════════════════════════════════════════════════\n');

const signature = generateSignature(testPaymentData, CONFIG.PASSPHRASE);
console.log(`Generated Signature: ${signature}\n`);

// Test variations
console.log('Testing variations:\n');

const variations = [
  { name: 'Without passphrase', pass: '' },
  { name: 'With passphrase (as-is)', pass: CONFIG.PASSPHRASE },
  { name: 'With trimmed passphrase', pass: CONFIG.PASSPHRASE?.trim() },
];

variations.forEach(({ name, pass }) => {
  if (pass === undefined) return;
  const sig = generateSignature(testPaymentData, pass);
  const match = sig === signature ? '✓ MATCH' : '';
  console.log(`  ${name}:`);
  console.log(`    ${sig} ${match}`);
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('NEXT STEPS:');
console.log('═══════════════════════════════════════════════════════════');
console.log('1. If credentials are correct, test a payment');
console.log('2. Check logs: wrangler tail');
console.log('3. Compare signature in logs with the one above');
console.log('4. If mismatch, check for whitespace issues');
console.log('');
