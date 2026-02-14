# PayFast Signature Mismatch Fix

## Issues Found

### 1. **Missing PayFast Credentials** (CRITICAL)
Your `.dev.vars` file has empty PayFast credentials:
```
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
```

### 2. **Mode Mismatch**
- `wrangler.toml` has `PAYFAST_MODE = "live"`
- `.dev.vars` has `PAYFAST_MODE=sandbox`

### 3. **Incorrect Signature Encoding**
The signature generation was using `encodeURIComponent()` which over-encodes values. PayFast requires minimal encoding.

## Fixes Applied

### 1. Fixed Signature Encoding
Changed from:
```javascript
const encodeValue = (value) =>
  encodeURIComponent(String(value)).replace(/%20/g, '+');
```

To:
```javascript
const encodeValue = (value) => {
  // PayFast requires specific encoding: spaces as '+', but preserve other special chars
  return String(value).replace(/ /g, '+');
};
```

### 2. Added Passphrase Validation
```javascript
const base = passphrase && passphrase.trim()
  ? `${payload}&passphrase=${encodeValue(passphrase)}`
  : payload;
```

### 3. Added Comprehensive Logging
Now logs payment initiation details to help debug signature issues.

## Required Configuration

### For Sandbox Testing:

Update `backend/.dev.vars`:
```bash
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=
PAYFAST_MODE=sandbox
```

**Note:** Sandbox does NOT require a passphrase. Leave it empty.

### For Production:

Update production secrets:
```bash
cd backend
wrangler secret put PAYFAST_MERCHANT_ID
# Enter your live merchant ID

wrangler secret put PAYFAST_MERCHANT_KEY
# Enter your live merchant key

wrangler secret put PAYFAST_PASSPHRASE
# Enter your live passphrase (if you set one in PayFast dashboard)

wrangler secret put PAYFAST_MODE
# Enter: live
```

Update `backend/wrangler.toml`:
```toml
[vars]
PAYFAST_MODE = "live"
```

## PayFast Signature Requirements

PayFast signature is generated as follows:

1. **Sort parameters alphabetically** by key
2. **Filter out** empty, null, or undefined values
3. **Encode values** - only replace spaces with `+`
4. **Join with `&`** - `key1=value1&key2=value2`
5. **Append passphrase** (if set) - `...&passphrase=yourpassphrase`
6. **MD5 hash** the entire string

Example:
```
amount=100.00&cancel_url=...&email_address=user@example.com&...&passphrase=secret
```
Then MD5 hash this string.

## Testing Steps

### 1. Get Sandbox Credentials
- Go to https://sandbox.payfast.co.za
- Login or create account
- Get your Merchant ID and Merchant Key
- **Do NOT set a passphrase for sandbox**

### 2. Update Configuration
```bash
# Edit backend/.dev.vars
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=
PAYFAST_MODE=sandbox
```

### 3. Restart Backend
```bash
cd backend
npm run dev
```

### 4. Test Payment
- Go to tokens page
- Select a package
- Click "Buy Tokens"
- You should be redirected to PayFast sandbox
- Use test card: 4000 0000 0000 0002

### 5. Check Logs
Look for:
```
[Payfast] Payment initiated {
  mode: 'sandbox',
  merchant_id: '10000100',
  payment_id: '...',
  amount: '10.00',
  has_passphrase: false,
  signature_length: 32
}
```

## Common Issues

### "Signature Mismatch"
- **Cause:** Wrong passphrase or encoding issue
- **Fix:** 
  - For sandbox: Leave passphrase EMPTY
  - For live: Use exact passphrase from PayFast dashboard
  - Ensure no extra spaces in credentials

### "Merchant ID Invalid"
- **Cause:** Wrong merchant ID
- **Fix:** Copy exact ID from PayFast dashboard (no spaces)

### "Amount Mismatch"
- **Cause:** Amount format incorrect
- **Fix:** Already handled - amounts are formatted as `X.XX` (e.g., "10.00")

## Production Checklist

Before going live:

- [ ] Get live credentials from PayFast dashboard
- [ ] Set passphrase in PayFast dashboard (optional but recommended)
- [ ] Update production secrets via `wrangler secret put`
- [ ] Set `PAYFAST_MODE` to "live" in wrangler.toml
- [ ] Test with small amount first
- [ ] Verify ITN (Instant Transaction Notification) is working
- [ ] Check that notify_url is accessible from PayFast servers

## Support

If issues persist:
1. Check PayFast logs in their dashboard
2. Enable debug mode: `PAYFAST_SIGNATURE_DEBUG=true` in .dev.vars
3. Check backend console logs for signature details
4. Contact PayFast support with transaction ID
