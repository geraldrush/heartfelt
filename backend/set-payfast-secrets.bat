@echo off
REM Safe PayFast Secret Configuration Script for Windows
REM This ensures no whitespace issues when setting secrets

echo ================================================================
echo          PayFast Secret Configuration (Production)
echo ================================================================
echo.
echo This script will set your PayFast secrets safely.
echo Make sure you have the correct values from PayFast dashboard.
echo.

set /p MERCHANT_ID="Enter PAYFAST_MERCHANT_ID: "
set /p MERCHANT_KEY="Enter PAYFAST_MERCHANT_KEY: "
set /p PASSPHRASE="Enter PAYFAST_PASSPHRASE (or press Enter to skip): "

echo.
echo Setting secrets...

REM Set merchant ID
echo|set /p="%MERCHANT_ID%" | wrangler secret put PAYFAST_MERCHANT_ID
echo [OK] PAYFAST_MERCHANT_ID set

REM Set merchant key
echo|set /p="%MERCHANT_KEY%" | wrangler secret put PAYFAST_MERCHANT_KEY
echo [OK] PAYFAST_MERCHANT_KEY set

REM Set passphrase (if provided)
if not "%PASSPHRASE%"=="" (
    echo|set /p="%PASSPHRASE%" | wrangler secret put PAYFAST_PASSPHRASE
    echo [OK] PAYFAST_PASSPHRASE set
) else (
    echo [SKIP] PAYFAST_PASSPHRASE skipped (empty)
)

REM Set debug flag
echo|set /p="true" | wrangler secret put PAYFAST_SIGNATURE_DEBUG
echo [OK] PAYFAST_SIGNATURE_DEBUG set to true

echo.
echo Done! Secrets configured safely without whitespace.
echo.
echo Next steps:
echo 1. Deploy: wrangler deploy
echo 2. Test a payment
echo 3. Check logs: wrangler tail
echo 4. Once working, disable debug:
echo    echo^|set /p="false" ^| wrangler secret put PAYFAST_SIGNATURE_DEBUG
echo.
pause
