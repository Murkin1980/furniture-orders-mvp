# Communication Channels Readiness Checklist

Date: 2026-06-28
Status: Documentation only — no channel adapter has been implemented yet.

---

## Current State

- Telegram notification: ✅ instant + AI-enriched (outbound only, no inbound dialog)
- AI communications drafts: ✅ suggest-reply with manager approval, no auto-send
- WhatsApp: ❌ not implemented
- Two-way Telegram dialog: ❌ not implemented

## Before Adding Any New Channel

Each new channel adapter must meet the following requirements before production
enablement. This checklist is tied to the existing AI communications safety
boundary defined in `docs/decisions/AI_COMMUNICATIONS_DECISION.md`.

### 1. Security & Auth

- [ ] Provider API credentials stored only in Cloudflare Pages secrets
- [ ] Webhook endpoint protected by HMAC or bearer token verification
- [ ] Rate limiting configured per channel (minimum 1 msg/sec)

### 2. Consent & Audit

- [ ] Per-order consent check before sending (opt-in required)
- [ ] All outbound messages logged as `order_interactions` with provider metadata
- [ ] All inbound messages stored as `order_interactions` with source provider
- [ ] Messages never sent without explicit manager approval (see AI_COMMUNICATIONS_DECISION)

### 3. Channel-Specific Requirements

| Channel | Keys Required | Rate Limits | Documentation |
|---------|-------------|-------------|---------------|
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | 30 msg/sec per chat | https://core.telegram.org/bots/api |
| WhatsApp | Meta Business Account, WhatsApp Business API key | ~250 msg/day (tier 1) | https://developers.facebook.com/docs/whatsapp/api/ |

### 4. Integration Points

- [ ] `POST /api/orders/:id/send-message` — protected endpoint with channel selector
- [ ] Webhook receiver for inbound messages → `order_interactions` storage
- [ ] Delivery status tracking (sent, delivered, read, failed)
- [ ] Channel adapter follows plugin pattern: `src/channels/telegram.js`, `src/channels/whatsapp.js`

### 5. Safety Gates

- [ ] `CHANNEL_TELEGRAM_ENABLED=false` by default
- [ ] `CHANNEL_WHATSAPP_ENABLED=false` by default
- [ ] Never auto-send AI-generated drafts without explicit manager approval
- [ ] Draft approval must be confirmed before sending through any channel

### 6. Testing

- [ ] Synthetic delivery test with non-production credentials
- [ ] Webhook echo test (platform sends → external service echoes → platform stores)
- [ ] Rate limit resilience test (no tight retry loops after HTTP 429)

## Prohibited

- Auto-send on order creation (even with AI analysis)
- Sending through multiple channels without per-channel manager confirmation
- Falling back from one channel to another without manager awareness
- Storing plaintext provider API keys in code, config, or database
