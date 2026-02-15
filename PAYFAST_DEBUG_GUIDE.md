# PayFast Signature Mismatch Debugging Guide

## Common Causes (Beyond Credentials)

### 1. **Passphrase Issues** ⚠️ MOST COMMON
- **Whitespace**: Passphrase has trailing spaces or newlines
  ```bash
  # Check in .dev.vars or wrangler secrets
  PAYFAST_PASSPHRASE=mypassphrase   # ❌ Has trailing spaces
  PAYFAST_PASSPHRASE=mypassphrase   # ✓ No trailing spaces
  ```
- **Newlines**: Copying from file adds `\n`
  ```bash
  # Wrong way
  echo "mypassphrase" > passphrase.txt  # Adds newline!
  
  # Right way
  echo -n "mypassphrase" > passphrase.txt  # No newline
  ```
- **Not set in PayFast dashboard**: Passphrase in code but not in PayFast settings
- **Mismatch**: Different passphrase between sandbox and live

### 2. **Environment Variable Issues**
- Using sandbox credentials with `PAYFAST_MODE=live` (or vice versa)
- Credentials not synced between:
  - `.dev.vars` (local development)
  - `wrangler secret` (production)
  - PayFast dashboard settings

### 3. **Parameter Encoding Issues**
- Special characters in item descriptions
- Spaces encoded as `%20` instead of `+`
- URL encoding differences

### 4. **Parameter Value Issues**
- Amount formatting: `50` vs `50.00` vs `50.0`
- Email address with special characters
- Item description with special characters

### 5. **Timing Issues**
- Using old signature after parameter changes
- Cached payment data with stale signature

### 6. **Mode Mismatch**
- Testing with sandbox merchant_id but live passphrase
- Using live credentials in sandbox mode

## Debugging Steps

### Step 0: Check Your Secrets (CRITICAL for Production)

If using `wrangler secret put`, whitespace can be added:

```bash
# Check what secrets are set
wrangler secret list

# Re-set secrets WITHOUT whitespace (Linux/Mac)
echo -n "your_merchant_id" | wrangler secret put PAYFAST_MERCHANT_ID
echo -n "your_merchant_key" | wrangler secret put PAYFAST_MERCHANT_KEY
echo -n "your_passphrase" | wrangler secret put PAYFAST_PASSPHRASE

# Or use the safe script
cd backend
chmod +x set-payfast-secrets.sh
./set-payfast-secrets.sh  # Linux/Mac
# OR
set-payfast-secrets.bat   # Windows
```

**Common mistake**: Using `echo` without `-n` adds a newline!
```bash
# ❌ WRONG - Adds \n to your passphrase
echo "mypass" | wrangler secret put PAYFAST_PASSPHRASE

# ✓ CORRECT - No newline
echo -n "mypass" | wrangler secret put PAYFAST_PASSPHRASE
```

### Step 1: Enable Debug Mode

Add to your `.dev.vars`:
```bash
PAYFAST_SIGNATURE_DEBUG=true
```

For production, set via wrangler:
```bash
cd backend
wrangler secret put PAYFAST_SIGNATURE_DEBUG
# Enter: true
```

### Step 2: Check Your Configuration

Run the test script:
```bash
cd backend
node test-payfast-signature.js
```

Update the CONFIG section with your actual credentials first.

### Step 3: Verify Credentials Match

| Location | Check |
|----------|-------|
| PayFast Dashboard | Settings → Integration |
| `.dev.vars` | PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY |
| Wrangler Secrets | `wrangler secret list` |
| Mode | PAYFAST_MODE (sandbox/live) |

### Step 4: Check Passphrase

```bash
# In .dev.vars, check for whitespace
cat -A backend/.dev.vars | grep PAYFAST_PASSPHRASE

# Should show:
PAYFAST_PASSPHRASE=yourpassphrase$
# NOT:
PAYFAST_PASSPHRASE=yourpassphrase $  # ❌ Extra space
PAYFAST_PASSPHRASE=yourpassphrase^M$ # ❌ Windows line ending
```

### Step 5: Test Payment Flow

1. Initiate a test payment
2. Check Cloudflare Workers logs:
   ```bash
   wrangler tail
   ```
3. Look for `[Payfast] Payment initiated` log
4. Note the generated signature

### Step 6: Compare Signatures

When PayFast redirects back, check the ITN (Instant Transaction Notification):

1. Look for `[Payfast] ITN signature mismatch` in logs
2. The debug output will show:
   - Expected signature (what you generated)
   - Received signature (what PayFast sent)
   - Character-by-character comparison

## Quick Fixes

### Fix 1: Remove Passphrase Whitespace

```bash
# In .dev.vars
PAYFAST_PASSPHRASE=mypassphrase  # Remove any trailing spaces

# For production
wrangler secret put PAYFAST_PASSPHRASE
# Paste carefully, no extra spaces
```

### Fix 2: Verify Mode Matches Credentials

```bash
# Sandbox mode
PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=10000100  # Sandbox merchant ID
PAYFAST_MERCHANT_KEY=46f0cd694581a  # Sandbox merchant key
PAYFAST_PASSPHRASE=  # Sandbox passphrase (if set in dashboard)

# Live mode
PAYFAST_MODE=live
PAYFAST_MERCHANT_ID=12345678  # Live merchant ID
PAYFAST_MERCHANT_KEY=abcdef123456  # Live merchant key
PAYFAST_PASSPHRASE=your_live_passphrase  # Live passphrase
```

### Fix 3: Check PayFast Dashboard Settings

1. Log into PayFast dashboard
2. Go to Settings → Integration
3. Verify:
   - Merchant ID matches your config
   - Merchant Key matches your config
   - Passphrase is set (if you're using one)
   - Security settings allow your notify_url

### Fix 4: Test Without Passphrase First

Temporarily remove passphrase to isolate the issue:

```bash
# In .dev.vars
PAYFAST_PASSPHRASE=

# In PayFast dashboard
# Settings → Integration → Remove passphrase
```

If this works, the issue is with your passphrase configuration.

## Validation Checklist

- [ ] Merchant ID matches between code and PayFast dashboard
- [ ] Merchant Key matches between code and PayFast dashboard
- [ ] Passphrase matches between code and PayFast dashboard (or both empty)
- [ ] No trailing whitespace in passphrase
- [ ] No newline characters in passphrase
- [ ] PAYFAST_MODE matches credentials (sandbox vs live)
- [ ] notify_url is accessible from PayFast servers
- [ ] PAYFAST_SIGNATURE_DEBUG=true is enabled
- [ ] Checked Cloudflare Workers logs during payment

## Reading Debug Output

When `PAYFAST_SIGNATURE_DEBUG=true`, you'll see:

```
========== PAYFAST SIGNATURE DEBUG ==========

1. RAW DATA:
  merchant_id: "10000100" (type: string, length: 8)
  merchant_key: "46f0cd694581a" (type: string, length: 13)
  ...

2. FILTERED KEYS (non-empty):
  amount, cancel_url, email_address, ...

3. SORTED KEYS:
  amount, cancel_url, email_address, ...

4. ENCODED KEY=VALUE PAIRS:
  amount=50.00
  cancel_url=https://...
  ...

5. JOINED PAYLOAD:
  amount=50.00&cancel_url=https://...
  Length: 234 characters

6. PASSPHRASE:
  Has passphrase: YES
  Length: 16 characters
  Trimmed length: 16 characters

7. FINAL STRING TO HASH:
  amount=50.00&...&passphrase=***
  Length: 250 characters

8. GENERATED SIGNATURE:
  a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
  Length: 32 characters

========== END DEBUG ==========
```

Look for:
- ⚠️ warnings about whitespace
- Length mismatches
- Encoding issues

## Still Having Issues?

1. **Compare with PayFast's test tool**:
   - Use PayFast's signature generator in their dashboard
   - Compare with your generated signature

2. **Check parameter order**:
   - Must be alphabetical
   - Case-sensitive

3. **Verify encoding**:
   - Spaces as `+` not `%20`
   - Special characters properly encoded

4. **Test with minimal data**:
   ```javascript
   const minimal = {
     merchant_id: 'YOUR_ID',
     merchant_key: 'YOUR_KEY',
     amount: '50.00',
   };
   ```

5. **Contact PayFast support** with:
   - Your merchant ID
   - Example payment data
   - Generated signature
   - Timestamp of failed transaction

## Production Deployment

Before going live:

1. Set production secrets:
   ```bash
   cd backend
   wrangler secret put PAYFAST_MERCHANT_ID
   wrangler secret put PAYFAST_MERCHANT_KEY
   wrangler secret put PAYFAST_PASSPHRASE
   ```

2. Update wrangler.toml:
   ```toml
   [vars]
   PAYFAST_MODE = "live"
   ```

3. Test with small amount first

4. Disable debug mode:
   ```bash
   wrangler secret put PAYFAST_SIGNATURE_DEBUG
   # Enter: false
   ```
