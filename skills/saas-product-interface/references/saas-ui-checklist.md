# Operational SaaS UI Checklist

Use this checklist selectively. A requirement is relevant only when it supports
the product's users and workflows.

## 1. Context

- Who is the primary user for this surface?
- What are their three most frequent tasks?
- What information must be visible before they can act?
- Which actions are risky, irreversible, slow, or permission-sensitive?
- What existing conventions and backend contracts must remain stable?

## 2. Navigation and architecture

- Navigation names match the user's domain language.
- The current location and selected mode are visible.
- Frequent destinations require few predictable steps.
- Related data and actions are grouped together.
- Rare settings and infrastructure controls do not dominate daily work.
- Desktop and mobile navigation remain usable without hidden dead ends.

## 3. Workflows and controls

- The primary action is clear but not oversized.
- Frequent row/card actions are close to the affected record.
- Buttons use clear commands; icons have labels or tooltips when unfamiliar.
- Forms have persistent labels, useful defaults, and concise instructions.
- Filters show their active state and can be cleared.
- Destructive actions are separated and require appropriate confirmation.
- Long tasks show progress and preserve user context.

## 4. Data surfaces

- Summary metrics answer a real decision question.
- Tables support scanning, sorting/filtering where needed, and meaningful empty
  states.
- Status is never communicated by color alone.
- Numbers include units, currency, date context, and useful precision.
- Dense information remains readable without turning every section into cards.
- Mobile prioritizes essential columns/actions and provides another way to see
  full details.

## 5. System states

- Loading indicates what is loading.
- Success confirms the result and relevant next step.
- Errors use plain language, state what failed, and suggest recovery.
- Empty states explain why the surface is empty and offer a relevant action.
- Disabled controls explain prerequisites when the reason is not obvious.
- Saved/unsaved, draft/published, online/offline, and stale states are explicit.

## 6. Accessibility and responsiveness

- Semantic headings, labels, landmarks, tables, and buttons are used.
- Keyboard focus is visible and follows a logical order.
- Text and non-text controls have sufficient contrast.
- Interaction targets are comfortably usable on touch screens.
- Content reflows without incoherent overlap or clipped actions.
- Zoom, long labels, validation messages, and dynamic content do not break the
  layout.

## 7. Visual quality

- Hierarchy reflects task priority.
- Typography fits the density and container size.
- Spacing is consistent and supports grouping.
- Semantic colors are consistent and restrained.
- Cards frame individual items or tools, not every page section.
- Motion explains change or provides feedback; it does not delay work.

## 8. Verification

- Walk through the primary workflow from start to finish.
- Test empty, loading, error, partial, and success states.
- Capture and inspect desktop and mobile screenshots.
- Check console/network failures when relevant.
- Run focused UI tests and the project's existing checks.
- Record user-facing changes, known limitations, and the next slice.
