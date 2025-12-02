#!/bin/bash
# Script to clear WhatsApp Web.js cache
# This fixes compatibility issues when WhatsApp Web updates

echo "🧹 Clearing WhatsApp Web.js cache..."
rm -rf .wwebjs_auth
rm -rf .wwebjs_cache
echo "✅ Cache cleared!"
echo ""
echo "📱 Next steps:"
echo "   1. Restart the bot: bun start"
echo "   2. Scan the new QR code with WhatsApp"
echo ""


