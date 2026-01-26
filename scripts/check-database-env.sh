#!/bin/bash

# Script to check if you're using the correct database for your environment

echo "🔍 Checking Database Configuration..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️  No .env file found"
  exit 1
fi

# Extract DATABASE_URL from .env
DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL not found in .env"
  exit 1
fi

# Check if it's a production database (common patterns)
if echo "$DB_URL" | grep -q "prod\|production\|main"; then
  echo "⚠️  WARNING: Your .env file appears to use a PRODUCTION database!"
  echo "   Database URL contains: prod/production/main"
  echo ""
  echo "   This is DANGEROUS - local testing will affect real users!"
  echo ""
  echo "   Action required:"
  echo "   1. Create a separate development database"
  echo "   2. Update .env to use the dev database URL"
  echo "   3. Never commit production database URLs to code"
  exit 1
fi

# Check if it's localhost (safer for dev)
if echo "$DB_URL" | grep -q "localhost\|127.0.0.1"; then
  echo "✅ Using local database (localhost) - Safe for development"
  exit 0
fi

# Check if it contains 'dev' or 'test'
if echo "$DB_URL" | grep -qi "dev\|test\|staging"; then
  echo "✅ Using development/test database - Safe for development"
  exit 0
fi

# If we get here, it's unclear - warn user
echo "⚠️  Could not determine database type from URL"
echo "   Please verify you're using a DEVELOPMENT database, not production"
echo ""
echo "   Current DATABASE_URL starts with: ${DB_URL:0:30}..."
