#!/bin/bash
# Generate NEXTAUTH_SECRET for production deployment
# Usage: ./scripts/generate-secret.sh

echo "Generating NEXTAUTH_SECRET..."
SECRET=$(openssl rand -base64 32)
echo ""
echo "Add this to your Vercel environment variables:"
echo "NEXTAUTH_SECRET=$SECRET"
echo ""

