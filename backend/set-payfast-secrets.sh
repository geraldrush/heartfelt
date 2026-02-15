#!/bin/bash
# Safe PayFast Secret Configuration Script
# This ensures no whitespace issues when setting secrets

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         PayFast Secret Configuration (Production)         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will set your PayFast secrets safely."
echo "Make sure you have the correct values from PayFast dashboard."
echo ""

# Function to set secret without newline
set_secret() {
    local name=$1
    local value=$2
    echo -n "$value" | wrangler secret put "$name"
}

# Get values
read -p "Enter PAYFAST_MERCHANT_ID: " MERCHANT_ID
read -p "Enter PAYFAST_MERCHANT_KEY: " MERCHANT_KEY
read -p "Enter PAYFAST_PASSPHRASE (or press Enter to skip): " PASSPHRASE

echo ""
echo "Setting secrets..."

# Set merchant ID
echo -n "$MERCHANT_ID" | wrangler secret put PAYFAST_MERCHANT_ID
echo "✓ PAYFAST_MERCHANT_ID set"

# Set merchant key
echo -n "$MERCHANT_KEY" | wrangler secret put PAYFAST_MERCHANT_KEY
echo "✓ PAYFAST_MERCHANT_KEY set"

# Set passphrase (if provided)
if [ -n "$PASSPHRASE" ]; then
    echo -n "$PASSPHRASE" | wrangler secret put PAYFAST_PASSPHRASE
    echo "✓ PAYFAST_PASSPHRASE set"
else
    echo "⊘ PAYFAST_PASSPHRASE skipped (empty)"
fi

# Set debug flag
echo -n "true" | wrangler secret put PAYFAST_SIGNATURE_DEBUG
echo "✓ PAYFAST_SIGNATURE_DEBUG set to true"

echo ""
echo "Done! Secrets configured safely without whitespace."
echo ""
echo "Next steps:"
echo "1. Deploy: wrangler deploy"
echo "2. Test a payment"
echo "3. Check logs: wrangler tail"
echo "4. Once working, disable debug: echo -n 'false' | wrangler secret put PAYFAST_SIGNATURE_DEBUG"
