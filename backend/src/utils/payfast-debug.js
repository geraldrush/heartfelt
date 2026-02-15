import { createHash } from 'node:crypto';

/**
 * Comprehensive PayFast signature debugging utility
 * Use this to identify signature mismatch issues
 */

const encodeValue = (value) => {
  return encodeURIComponent(String(value))
    .replace(/%20/g, '+')
    .replace(/%2D/g, '-')
    .replace(/%5F/g, '_')
    .replace(/%2E/g, '.')
    .replace(/%7E/g, '~');
};

export function debugSignature(data, passphrase, options = {}) {
  const { showPassphrase = false } = options;
  
  console.log('\n========== PAYFAST SIGNATURE DEBUG ==========');
  
  // Step 1: Show raw data
  console.log('\n1. RAW DATA:');
  Object.keys(data).forEach(key => {
    const value = data[key];
    console.log(`  ${key}: "${value}" (type: ${typeof value}, length: ${String(value).length})`);
  });
  
  // Step 2: Filter empty values
  const filtered = Object.keys(data)
    .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '');
  
  console.log('\n2. FILTERED KEYS (non-empty):');
  console.log(`  ${filtered.join(', ')}`);
  
  // Step 3: Sort alphabetically
  const sorted = filtered.sort();
  console.log('\n3. SORTED KEYS:');
  console.log(`  ${sorted.join(', ')}`);
  
  // Step 4: Encode each value
  console.log('\n4. ENCODED KEY=VALUE PAIRS:');
  const pairs = sorted.map((key) => {
    const raw = data[key];
    const encoded = encodeValue(raw);
    const pair = `${key}=${encoded}`;
    console.log(`  ${pair}`);
    if (raw !== encoded) {
      console.log(`    (raw: "${raw}" -> encoded: "${encoded}")`);
    }
    return pair;
  });
  
  // Step 5: Join with &
  const payload = pairs.join('&');
  console.log('\n5. JOINED PAYLOAD:');
  console.log(`  ${payload}`);
  console.log(`  Length: ${payload.length} characters`);
  
  // Step 6: Add passphrase
  console.log('\n6. PASSPHRASE:');
  if (!passphrase || !passphrase.trim()) {
    console.log('  ⚠️  NO PASSPHRASE PROVIDED');
  } else {
    console.log(`  Has passphrase: YES`);
    console.log(`  Length: ${passphrase.length} characters`);
    console.log(`  Trimmed length: ${passphrase.trim().length} characters`);
    if (showPassphrase) {
      console.log(`  Value: "${passphrase}"`);
      // Skip hex display in Cloudflare Workers (Buffer not available)
      try {
        console.log(`  Hex: ${Buffer.from(passphrase).toString('hex')}`);
      } catch (e) {
        // Buffer not available in Workers environment
      }
    }
    
    // Check for common issues
    if (passphrase !== passphrase.trim()) {
      console.log('  ⚠️  WARNING: Passphrase has leading/trailing whitespace!');
    }
    if (passphrase.includes('\n') || passphrase.includes('\r')) {
      console.log('  ⚠️  WARNING: Passphrase contains newline characters!');
    }
  }
  
  const base = passphrase && passphrase.trim()
    ? `${payload}&passphrase=${encodeValue(passphrase)}`
    : payload;
  
  console.log('\n7. FINAL STRING TO HASH:');
  console.log(`  ${showPassphrase ? base : base.replace(/passphrase=[^&]+/, 'passphrase=***')}`);
  console.log(`  Length: ${base.length} characters`);
  
  // Step 7: Generate MD5 hash
  const signature = createHash('md5').update(base).digest('hex');
  console.log('\n8. GENERATED SIGNATURE:');
  console.log(`  ${signature}`);
  console.log(`  Length: ${signature.length} characters`);
  
  console.log('\n========== END DEBUG ==========\n');
  
  return {
    signature,
    payload,
    base: showPassphrase ? base : base.replace(/passphrase=[^&]+/, 'passphrase=***'),
    hasPassphrase: Boolean(passphrase && passphrase.trim()),
  };
}

export function compareSignatures(data, receivedSignature, passphrase, options = {}) {
  console.log('\n========== SIGNATURE COMPARISON ==========');
  console.log(`\nReceived signature: ${receivedSignature}`);
  
  const result = debugSignature(data, passphrase, options);
  
  console.log('\n9. COMPARISON:');
  console.log(`  Expected:  ${result.signature}`);
  console.log(`  Received:  ${receivedSignature}`);
  console.log(`  Match:     ${result.signature === receivedSignature ? '✓ YES' : '✗ NO'}`);
  
  if (result.signature !== receivedSignature) {
    console.log('\n10. TROUBLESHOOTING:');
    console.log('  Possible causes:');
    console.log('  - Passphrase mismatch (check PayFast dashboard vs your config)');
    console.log('  - Parameter values modified in transit');
    console.log('  - Encoding differences');
    console.log('  - Extra/missing parameters');
    console.log('  - Whitespace in passphrase');
    
    // Character-by-character comparison
    if (result.signature.length === receivedSignature.length) {
      console.log('\n  Character differences:');
      for (let i = 0; i < result.signature.length; i++) {
        if (result.signature[i] !== receivedSignature[i]) {
          console.log(`    Position ${i}: expected '${result.signature[i]}' got '${receivedSignature[i]}'`);
        }
      }
    }
  }
  
  console.log('\n========== END COMPARISON ==========\n');
  
  return result.signature === receivedSignature;
}

export function testSignatureWithVariations(data, passphrase) {
  console.log('\n========== TESTING SIGNATURE VARIATIONS ==========\n');
  
  const variations = [
    { name: 'With passphrase (as provided)', pass: passphrase },
    { name: 'Without passphrase', pass: '' },
    { name: 'With trimmed passphrase', pass: passphrase?.trim() },
    { name: 'With passphrase + newline', pass: passphrase + '\n' },
    { name: 'With passphrase + space', pass: passphrase + ' ' },
  ];
  
  variations.forEach(({ name, pass }) => {
    console.log(`\n${name}:`);
    const sig = createHash('md5')
      .update(
        Object.keys(data)
          .sort()
          .filter((key) => data[key] !== undefined && data[key] !== null && data[key] !== '')
          .map((key) => `${key}=${encodeValue(data[key])}`)
          .join('&') + (pass ? `&passphrase=${encodeValue(pass)}` : '')
      )
      .digest('hex');
    console.log(`  Signature: ${sig}`);
  });
  
  console.log('\n========== END VARIATIONS ==========\n');
}
