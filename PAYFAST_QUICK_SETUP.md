# Quick PayFast Setup

## IMMEDIATE ACTION REQUIRED

Your PayFast credentials are missing! Update `backend/.dev.vars`:

### For Testing (Sandbox):
```bash
# Use PayFast's test credentials
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=
PAYFAST_MODE=sandbox
```

### For Production (Live):
```bash
# Get these from https://www.payfast.co.za/dashboard
PAYFAST_MERCHANT_ID=your_live_merchant_id
PAYFAST_MERCHANT_KEY=your_live_merchant_key
PAYFAST_PASSPHRASE=your_passphrase_if_set
PAYFAST_MODE=live
```

## After Updating:

1. Restart your backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Test payment flow

3. Check console for:
   ```
   [Payfast] Payment initiated
   ```

## Key Points:

- **Sandbox does NOT need a passphrase** - leave it empty
- **Live requires your actual credentials** from PayFast dashboard
- **Signature encoding has been fixed** in the code
- **No spaces** in merchant ID or key

## Test Card for Sandbox:
- Card: 4000 0000 0000 0002
- CVV: Any 3 digits
- Expiry: Any future date
