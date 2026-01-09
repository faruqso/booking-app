#!/bin/bash
# Check if all required environment variables are set
# Usage: ./scripts/check-env.sh

echo "Checking required environment variables..."
echo ""

MISSING=0

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set"
  MISSING=1
else
  echo "✅ DATABASE_URL is set"
fi

if [ -z "$NEXTAUTH_URL" ]; then
  echo "❌ NEXTAUTH_URL is not set"
  MISSING=1
else
  echo "✅ NEXTAUTH_URL is set: $NEXTAUTH_URL"
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "❌ NEXTAUTH_SECRET is not set"
  MISSING=1
else
  echo "✅ NEXTAUTH_SECRET is set"
fi

if [ -z "$RESEND_API_KEY" ]; then
  echo "⚠️  RESEND_API_KEY is not set (emails will be skipped)"
else
  echo "✅ RESEND_API_KEY is set"
fi

if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_APP_URL is not set (may cause issues)"
else
  echo "✅ NEXT_PUBLIC_APP_URL is set: $NEXT_PUBLIC_APP_URL"
fi

echo ""
if [ $MISSING -eq 1 ]; then
  echo "❌ Some required environment variables are missing!"
  echo "See DEPLOYMENT.md for setup instructions."
  exit 1
else
  echo "✅ All required environment variables are set!"
  exit 0
fi

