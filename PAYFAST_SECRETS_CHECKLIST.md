# PayFast Production Secrets Checklist

## The Problem with Wrangler Secrets

When you use `wrangler secret put`, it's easy to accidentally add whitespace:

```bash
# ❌ These add unwanted characters:
echo "mypassphrase" | wrangler secret put PAYFAST_PASSPHRASE  # Adds \n
wrangler secret put PAYFAST_PASSPHRASE < passphrase.txt      # May have \n
copy-paste into terminal                                      # May have spaces

# ✓ This is safe:
echo -n "mypassphrase" | wrangler secret put PAYFAST_PASSPHRASE
```

## Step-by-Step: Set Secrets Correctly

### Option 1: Use the Safe Script (Recommended)

**Windows:**
```cmd
cd backend
set-payfast-secrets.bat
```

**Linux/Mac:**
```bash
cd backend
chmod +x set-payfast-secrets.sh
./set-payfast-secrets.sh
```

### Option 2: Manual (Careful!)

**Windows:**
```cmd
cd backend

REM Set each secret (type carefully, no extra spaces!)
echo|set /p="10024538" | wrangler secret put PAYFAST_MERCHANT_ID
echo|set /p="q1w2e3r4t5" | wrangler secret put PAYFAST_MERCHANT_KEY
echo|set /p="MySecretPass123" | wrangler secret put PAYFAST_PASSPHRASE
echo|set /p="true" | wrangler secret put PAYFAST_SIGNATURE_DEBUG
```

**Linux/Mac:**
```bash
cd backend

# Set each secret (no newlines!)
echo -n "10024538" | wrangler secret put PAYFAST_MERCHANT_ID
echo -n "q1w2e3r4t5" | wrangler secret put PAYFAST_MERCHANT_KEY
echo -n "MySecretPass123" | wrangler secret put PAYFAST_PASSPHRASE
echo -n "true" | wrangler secret put PAYFAST_SIGNATURE_DEBUG
```

## Verification Checklist

After setting secrets:

- [ ] **List secrets**: `wrangler secret list`
  - Should show: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_SIGNATURE_DEBUG

- [ ] **Deploy**: `wrangler deploy`

- [ ] **Test payment**: Initiate a small test payment

- [ ] **Check logs**: `wrangler tail`
  - Look for: `[Payfast] Payment initiated`
  - Check: `passphrase_length` matches expected length
  - Note: `signature` value

- [ ] **Verify signature**: When PayFast redirects back
  - Look for: `[Payfast] ITN signature mismatch` (if error)
  - Check debug output for whitespace warnings

## Common Issues with Secrets

### Issue 1: Passphrase has extra newline

**Symptom:**
```
passphrase_length: 17  # Expected 16
⚠️  WARNING: Passphrase contains newline characters!
```

**Fix:**
```bash
# Re-set without newline
echo -n "MySecretPass123" | wrangler secret put PAYFAST_PASSPHRASE
```

### Issue 2: Passphrase has trailing space

**Symptom:**
```
passphrase_length: 17  # Expected 16
⚠️  WARNING: Passphrase has leading/trailing whitespace!
```

**Fix:**
```bash
# Re-set carefully (no spaces after!)
echo -n "MySecretPass123" | wrangler secret put PAYFAST_PASSPHRASE
```

### Issue 3: Wrong passphrase entirely

**Symptom:**
```
Expected:  a1b2c3d4e5f6...
Received:  x9y8z7w6v5u4...
Match:     ✗ NO
```

**Fix:**
1. Log into PayFast dashboard
2. Go to Settings → Integration
3. Copy passphrase EXACTLY
4. Re-set secret:
   ```bash
   echo -n "EXACT_PASSPHRASE_FROM_DASHBOARD" | wrangler secret put PAYFAST_PASSPHRASE
   ```

### Issue 4: No passphrase in dashboard but set in code

**Symptom:**
```
has_passphrase: true  # But PayFast dashboard has no passphrase
```

**Fix:**
Either:
- Add passphrase to PayFast dashboard (Settings → Integration)
- OR remove from code:
  ```bash
  wrangler secret delete PAYFAST_PASSPHRASE
  ```

## Testing Your Secrets

After setting secrets, test locally first:

1. **Update `.dev.vars`** with same values:
   ```bash
   PAYFAST_MERCHANT_ID=10024538
   PAYFAST_MERCHANT_KEY=q1w2e3r4t5
   PAYFAST_PASSPHRASE=MySecretPass123
   PAYFAST_MODE=sandbox
   PAYFAST_SIGNATURE_DEBUG=true
   ```

2. **Run local test**:
   ```bash
   npm run dev:backend
   ```

3. **Test payment locally** - if it works, secrets are correct

4. **Deploy to production**:
   ```bash
   wrangler deploy
   ```

5. **Test production payment**

## Emergency: Reset All Secrets

If completely stuck:

```bash
cd backend

# Delete all PayFast secrets
wrangler secret delete PAYFAST_MERCHANT_ID
wrangler secret delete PAYFAST_MERCHANT_KEY
wrangler secret delete PAYFAST_PASSPHRASE
wrangler secret delete PAYFAST_SIGNATURE_DEBUG

# Re-set using safe script
./set-payfast-secrets.sh  # or .bat on Windows
```

## Production Deployment Checklist

Before going live:

- [ ] Test in sandbox mode first
- [ ] Verify all secrets are set: `wrangler secret list`
- [ ] Update `wrangler.toml`: `PAYFAST_MODE = "live"`
- [ ] Set live credentials (different from sandbox!)
- [ ] Deploy: `wrangler deploy`
- [ ] Test with small amount (R1.00)
- [ ] Monitor logs: `wrangler tail`
- [ ] Once stable, disable debug:
  ```bash
  echo -n "false" | wrangler secret put PAYFAST_SIGNATURE_DEBUG
  ```

## Need Help?

1. Check logs: `wrangler tail`
2. Look for `[Payfast]` messages
3. Check `passphrase_length` in logs
4. Compare with expected length
5. Re-set secrets using safe script
6. See `PAYFAST_DEBUG_GUIDE.md` for more details
