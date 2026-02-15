# PayFast Signature Mismatch - Quick Reference

## Top 5 Causes (In Order of Frequency)

### 1. 🔴 Passphrase Whitespace (60% of cases)
```bash
# Check for trailing spaces/newlines
cat -A backend/.dev.vars | grep PAYFAST_PASSPHRASE

# Fix: Remove all whitespace
PAYFAST_PASSPHRASE=yourpassphrase  # No spaces after!
```

### 2. 🟠 Passphrase Not Set in PayFast Dashboard (20%)
- Code has passphrase, but PayFast dashboard doesn't
- Or vice versa
- **Fix**: Both must match exactly, or both must be empty

### 3. 🟡 Mode Mismatch (10%)
```bash
# Using sandbox credentials with live mode
PAYFAST_MODE=live  # ❌ Wrong!
PAYFAST_MERCHANT_ID=10000100  # Sandbox ID

# Fix: Match mode to credentials
PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=10000100
```

### 4. 🟢 Credentials Mismatch (5%)
- Typo in merchant_id or merchant_key
- Using old credentials
- **Fix**: Copy-paste from PayFast dashboard

### 5. 🔵 Environment Not Synced (5%)
- Works locally, fails in production
- **Fix**: Set wrangler secrets
```bash
wrangler secret put PAYFAST_MERCHANT_ID
wrangler secret put PAYFAST_MERCHANT_KEY
wrangler secret put PAYFAST_PASSPHRASE
```

## Quick Debug Commands

```bash
# 0. Check production secrets (IMPORTANT!)
wrangler secret list

# 0b. Re-set secrets safely (if needed)
cd backend
./set-payfast-secrets.sh  # Linux/Mac
# OR
set-payfast-secrets.bat   # Windows

# 1. Enable debug mode
echo "PAYFAST_SIGNATURE_DEBUG=true" >> backend/.dev.vars
# For production:
echo -n "true" | wrangler secret put PAYFAST_SIGNATURE_DEBUG

# 2. Check for whitespace issues
cat -A backend/.dev.vars | grep PAYFAST

# 3. Test signature generation
cd backend
node test-payfast-signature.js

# 4. Watch logs during payment
wrangler tail

# 5. Check production secrets
wrangler secret list
```

## Instant Fixes

### Fix #1: Remove Passphrase Completely (Test)
```bash
# In .dev.vars
PAYFAST_PASSPHRASE=

# In PayFast Dashboard
Settings → Integration → Remove Passphrase → Save
```
If this works, your passphrase has an issue.

### Fix #2: Use Sandbox Test Credentials
```bash
PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=
```
If this works, your live credentials have an issue.

### Fix #3: Check Exact Match
```javascript
// In PayFast dashboard, copy these EXACTLY:
Merchant ID: 12345678
Merchant Key: abcdef123456
Passphrase: mySecretPass123

// In .dev.vars (no quotes, no spaces):
PAYFAST_MERCHANT_ID=12345678
PAYFAST_MERCHANT_KEY=abcdef123456
PAYFAST_PASSPHRASE=mySecretPass123
```

## What to Check in Logs

When you see signature mismatch:

```
[Payfast] ITN signature mismatch
  payment_id: abc123
  has_passphrase: true
  passphrase_length: 16  ← Should match dashboard
  received_signature: a1b2c3...
```

Then look for debug output:
```
========== SIGNATURE COMPARISON ==========
Expected:  a1b2c3d4e5f6...
Received:  x9y8z7w6v5u4...
Match:     ✗ NO

TROUBLESHOOTING:
  - Passphrase mismatch ← Most likely!
  - Parameter values modified
  - Encoding differences
```

## Emergency Checklist

- [ ] `PAYFAST_SIGNATURE_DEBUG=true` in .dev.vars
- [ ] Run `node test-payfast-signature.js`
- [ ] Check `cat -A .dev.vars | grep PAYFAST_PASSPHRASE`
- [ ] Verify PayFast dashboard passphrase matches
- [ ] Confirm mode (sandbox/live) matches credentials
- [ ] Check `wrangler tail` during payment
- [ ] Try without passphrase as test

## Need More Help?

See full guide: `PAYFAST_DEBUG_GUIDE.md`
