---
name: saas-product-interface
description: Design, implement, or review practical operational SaaS interfaces such as admin panels, CRM systems, dashboards, tables, settings, workflows, and complex forms. Use when Codex needs to improve SaaS UX/UI, plan an interface slice, translate a visual reference into a working product, reduce cognitive load, review usability/accessibility, or verify desktop and mobile workflows.
---

# SaaS Product Interface

Build operational software around user work, not decoration.

## Core workflow

1. Read the existing product and preserve working behavior.
2. Name the primary role, frequent tasks, risky actions, and required data.
3. Trace the shortest complete path for each frequent task.
4. Design information architecture and interaction states before styling.
5. Implement one reviewable UI slice without changing backend contracts unless
   the task requires it.
6. Verify behavior, desktop/mobile layout, keyboard access, and error states.
7. Record remaining UX debt and the next meaningful slice.

Read [references/saas-ui-checklist.md](references/saas-ui-checklist.md) before
designing or reviewing a substantial interface. Read
[references/source-notes.md](references/source-notes.md) when evaluating a
recommendation or explaining the reasoning behind a decision.

## Product rules

- Optimize for effectiveness, speed, error prevention, and recovery.
- Use the user's domain language; avoid internal implementation jargon.
- Keep navigation stable, visible, and organized by user goals.
- Show system status immediately: loading, saved, failed, empty, disabled,
  partial, and stale states.
- Prefer recognition over recall: expose labels, current filters, context, and
  next actions.
- Keep frequent actions close to the data they affect.
- Separate safe frequent actions from destructive or irreversible actions.
- Use progressive disclosure for rare or advanced controls.
- Use dashboards only to support a decision or action.
- Use charts only when comparison or trend is clearer than a number or table.
- Make tables scannable, filterable, and resilient to narrow screens.
- Treat mobile as task prioritization, not merely desktop compression.
- Never add personalization, themes, integrations, onboarding, or feedback
  controls without a concrete product need.

## Visual direction

- Match the product domain and existing design system.
- Operational SaaS should feel quiet, dense, predictable, and work-focused.
- Use clear hierarchy, restrained surfaces, and a limited semantic color set.
- Reserve color for meaning: primary action, status, warning, error, success.
- Avoid nested cards, oversized marketing typography, decorative gradients,
  and excessive empty space in work surfaces.
- Keep controls and labels consistent across related workflows.

## Required verification

- Preserve existing IDs, API contracts, and data behavior unless intentionally
  changed.
- Test the primary task, empty state, loading state, error state, and recovery.
- Verify desktop and mobile screenshots after meaningful visual changes.
- Check text wrapping, overflow, sticky elements, focus visibility, target
  sizes, contrast, and keyboard order.
- Run relevant project tests and syntax/type checks.
- For a completed slice, update the project's progress and reviewer records.

## Review output

For reviews, lead with findings ordered by user impact:

1. Blocked or unsafe tasks.
2. Confusing navigation, state, or terminology.
3. High-friction frequent workflows.
4. Accessibility and responsive failures.
5. Visual inconsistency and polish.

For implementation, summarize the user workflow improved, files changed,
checks run, and the next UI slice.
