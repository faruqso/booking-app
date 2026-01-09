#!/bin/bash

# Vercel Setup Script
# This script helps set up your Vercel project

set -e

echo "🚀 Vercel Deployment Setup"
echo "=========================="
echo ""

# Check if Vercel CLI is available
if ! command -v vercel &> /dev/null && ! command -v npx &> /dev/null; then
    echo "❌ Error: npx is required to run Vercel CLI"
    exit 1
fi

echo "📋 Step 1: Create Project via Vercel Dashboard"
echo "-----------------------------------------------"
echo "Since the directory name contains spaces, please create the project via web UI:"
echo ""
echo "1. Go to: https://vercel.com/new"
echo "2. Import repository: https://github.com/faruqso/booking-app"
echo "3. Project name: booking-app"
echo "4. Framework: Next.js (auto-detected)"
echo "5. Root Directory: ./ (default)"
echo "6. Build Command: npm run vercel-build (auto-detected)"
echo ""
echo "Press Enter after you've created the project in Vercel dashboard..."
read -r

echo ""
echo "📥 Step 2: Pull Project Settings"
echo "---------------------------------"
npx vercel@latest pull --yes --environment=production || {
    echo "⚠️  Could not pull settings. Make sure the project exists in Vercel."
    exit 1
}

echo ""
echo "✅ Project linked successfully!"
echo ""
echo "📝 Next Steps:"
echo "1. Add environment variables from vercel-env-template.txt"
echo "2. Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL with your Vercel URL"
echo "3. Deploy: npx vercel --prod"
echo ""

