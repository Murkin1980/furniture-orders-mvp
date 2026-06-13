# AI Communications Decision

## Decision

AI communications is a manager-assistance layer, not an autonomous customer
support bot.

The completed MVP capability is a manually requested reply suggestion with
manager editing, explicit approval/rejection, and an audit history. It may
draft text, but it cannot send a message, change an order, schedule a follow-up,
or perform another external action.

## Permission Model

| Action | Current permission |
|---|---|
| Read the minimum order context needed for a draft | Manual request only |
| Suggest a reply | Allowed when `AI_COMMUNICATIONS_ENABLED=true` |
| Send a reply | Forbidden |
| Change order status, notes, task, or follow-up | Forbidden |
| Contact a customer through Telegram or WhatsApp | Forbidden |
| Start automatically after order intake | Forbidden |

Every suggestion must return `requiresHumanApproval=true`. The manager reviews,
edits, copies, and sends the message outside the platform.

## Data Minimization

The first slice sends only furniture request context and existing normalized AI
signals. Phone, email, address, and raw payload are excluded from the prompt.

## First API

```text
POST /api/orders/:id/ai/suggest-reply
```

The endpoint:

- requires the existing admin token;
- requires `AI_COMMUNICATIONS_ENABLED=true`;
- loads the order;
- builds one reply suggestion;
- persists the draft for manager review without sending it.

The current implementation persists the returned draft in
`communication_drafts`. Managers can edit and review it through:

```text
GET  /api/communication-drafts?orderId=:id
POST /api/communication-drafts
```

An approved draft is still not sent automatically.

## MVP Completion Boundary

AI communications is complete for the current safe MVP scope when:

- a manager manually requests a suggestion;
- the suggestion is persisted as a draft;
- a manager can edit, approve, reject, and review its history;
- no external message is sent automatically;
- no order field is changed by the agent;
- every action remains protected by admin authentication and audit data.

Telegram/WhatsApp delivery adapters are future optional channel integrations,
not required to close this safe agent-assistance MVP.

## Next Safe Slices

1. Persist approved/edited drafts and communication history.
2. Add a Telegram channel adapter with explicit send confirmation.
3. Add WhatsApp only after selecting and verifying an official provider.
4. Let AI suggest CRM actions, then require separate approval for execution.
5. Consider narrow automation only after audit history and permissions are
stable.
