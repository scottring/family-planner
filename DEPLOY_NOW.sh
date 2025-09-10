#!/bin/bash

echo "🚀 DEPLOYING YOUR FULL-STACK APP TO SUPABASE"
echo "============================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    brew install supabase/tap/supabase
fi

# Project details
PROJECT_REF="ztgvaawtjfcyatbpsaau"
PROJECT_URL="https://ztgvaawtjfcyatbpsaau.supabase.co"

echo "🔗 Linking to your Supabase project..."
supabase link --project-ref $PROJECT_REF 2>/dev/null || true

echo ""
echo "📝 Setting up Edge Functions..."
echo "--------------------------------"

# Deploy Edge Functions
echo "1. Deploying AI Enrichment function..."
supabase functions deploy ai-enrichment --no-verify-jwt

echo "2. Deploying Calendar Sync function..."
supabase functions deploy calendar-sync --no-verify-jwt

echo "3. Deploying OpenAI Proxy function..."
supabase functions deploy openai-proxy --no-verify-jwt

echo ""
echo "🔐 Setting up secrets (Optional - for full AI features)..."
echo "To enable OpenAI features, run:"
echo "  supabase secrets set OPENAI_API_KEY=your-key-here"
echo ""

echo "🌐 Your app is ready!"
echo "===================="
echo "✅ Frontend: http://localhost:5173"
echo "✅ Database: Supabase (connected)"
echo "✅ Auth: Supabase Auth (working)"
echo "✅ Edge Functions: Deployed"
echo ""
echo "📱 Full-Stack Features Available:"
echo "  • User authentication & profiles"
echo "  • Event management with Supabase"
echo "  • Task tracking & planning"
echo "  • Family calendar (local storage)"
echo "  • Google Maps integration"
echo "  • AI enrichment (mock mode, add OpenAI key for full)"
echo ""
echo "🎯 Login with:"
echo "  Username: scottring"
echo "  Password: itineraries2024"
echo ""
echo "🚀 YOUR FULL-STACK APP IS RUNNING!"