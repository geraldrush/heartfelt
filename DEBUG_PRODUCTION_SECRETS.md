# Debug PayFast Secrets in Production (Cloudflare Dashboard)

Since your secrets are set in Cloudflare dashboard, you need to debug via logs.

## Step 1: Enable Debug Mode in Production

```bash
cd backend

# Set debug flag as secret
echo -n "true" | wrangler secret put PAYFAST_SIGNATURE_DEBUG
```

Or via Cloudflare Dashboard:
1. Go to Workers & Pages → heartfelt-api → Settings → Variables
2. Add secret: `PAYFAST_SIGNATURE_DEBUG` = `true`

## Step 2: Deploy

```bash
wrangler deploy
```

## Step 3: Test a Payment

1. Go to your app: https://afrodate.co.za
2. Try to buy tokens
3. Initiate payment

## Step 4: Watch Logs in Real-Time

```bash
wrangler tail
```

Or via Cloudflare Dashboard:
1. Workers & Pages → heartfelt-api → Logs → Begin log stream

## Step 5: Look for These Key Indicators

### When Payment Initiates:

```
[Payfast] Payment initiated
  mode: live
  merchant_id: 10024538
  payment_id: abc123
  amount: 50.00
  has_passphrase: true
  passphrase_length: 16  ← CHECK THIS!
  signature: a1b2c3d4e5f6...
```

**Check `passphrase_length`:**
- If it's 1 more than expected → You have a newline `\n`
- If it's 2 more than expected → You have `\r\n` (Windows line ending)
- If it's different → You have whitespace

### If Debug Mode Enabled, You'll See:

```
========== PAYFAST SIGNATURE DEBUG ==========

6. PASSPHRASE:
  Has passphrase: YES
  Length: 17 characters  ← Should be 16!
  Trimmed length: 16 characters  ← Confirms whitespace!
  ⚠️  WARNING: Passphrase has leading/trailing whitespace!
```

### When PayFast Sends ITN (callback):

```
[Payfast] ITN signature mismatch
  payment_id: abc123
  has_passphrase: true
  passphrase_length: 17  ← Extra character!
  received_signature: x9y8z7...

========== SIGNATURE COMPARISON ==========
Expected:  a1b2c3d4e5f6...
Received:  x9y8z7w6v5u4...
Match:     ✗ NO
```

## Step 6: Fix Based on Logs

### If you see whitespace warning:

**Re-set secrets WITHOUT whitespace:**

```bash
# Linux/Mac/WSL
echo -n "10024538" | wrangler secret put PAYFAST_MERCHANT_ID
echo -n "your_key" | wrangler secret put PAYFAST_MERCHANT_KEY
echo -n "your_pass" | wrangler secret put PAYFAST_PASSPHRASE

# Windows CMD
echo|set /p="10024538" | wrangler secret put PAYFAST_MERCHANT_ID
echo|set /p="your_key" | wrangler secret put PAYFAST_MERCHANT_KEY
echo|set /p="your_pass" | wrangler secret put PAYFAST_PASSPHRASE
```

### If passphrase length is correct but still fails:

1. Check PayFast dashboard passphrase matches exactly
2. Try without passphrase:
   ```bash
   wrangler secret delete PAYFAST_PASSPHRASE
   ```
   Then remove passphrase from PayFast dashboard too

## Quick Commands

```bash
# Enable debug
echo -n "true" | wrangler secret put PAYFAST_SIGNATURE_DEBUG

# Deploy
wrangler deploy

# Watch logs
wrangler tail

# After fixing, disable debug
echo -n "false" | wrangler secret put PAYFAST_SIGNATURE_DEBUG
```

## Common Fixes

### Fix 1: Newline in passphrase
```bash
# Your passphrase is "MyPass123" but stored as "MyPass123\n"
echo -n "MyPass123" | wrangler secret put PAYFAST_PASSPHRASE
```

### Fix 2: Wrong passphrase
```bash
# Copy EXACTLY from PayFast dashboard
echo -n "EXACT_FROM_DASHBOARD" | wrangler secret put PAYFAST_PASSPHRASE
```

### Fix 3: No passphrase needed
```bash
# Remove if PayFast dashboard has no passphrase
wrangler secret delete PAYFAST_PASSPHRASE
```

## You're Done When:

Logs show:
```
[Payfast] Payment initiated
  passphrase_length: 16  ← Matches your actual passphrase!
  
# No signature mismatch errors
# Payment completes successfully
```
