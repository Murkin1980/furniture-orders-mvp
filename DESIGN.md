# DESIGN.md

## Product identity

Furniture Orders MVP is a practical operating interface for furniture businesses. It should feel dependable, direct, and grounded in real work rather than like a generic SaaS demo.

## Visual mood

- Public furniture surfaces may use warm neutrals inspired by wood and paper.
- Admin and CRM use an AdminLTE-inspired operational shell: graphite sidebar,
  white topbar/panels, cool-gray canvas, and restrained blue actions.
- Semantic success, warning, and danger colors are muted and used only for
  status or recovery.
- Dense operational screens remain readable and calm.

## Color palette

Current canonical tokens:

```text
Warm background: #f4f0e8 / #f5f3ee
Warm panel:      #fffaf2 / #ffffff
Ink:             #211d18 / #1f2426
Muted text:      #6d665d / #697275
Line:            #ded3c5 / #d8d2c7
Primary teal:    #116466
Primary dark:    #0b4648
Accent rust:     #b14d25
Success:         #2e6b37
Danger:          #a13024 / #9f2d23
```

Admin and CRM shell tokens:

```text
Canvas:          #f4f6f9
Panel:           #ffffff
Sidebar:         #343a40
Sidebar border:  #4b545c
Ink:             #212529
Muted text:      #6c757d
Line:            #dee2e6
Primary blue:    #315c78
Success:         #4f765e
Warning:         #a06b2c
Danger:          #9b3a34
```

## Typography

- Current interface font: Golos Text (`400`, `500`, `600`, `700`) with Arial
  or Segoe UI system fallback. The web font uses `font-display: swap`.
- Structured OCR/JSON and technical output may retain a monospace font where
  character alignment supports review work.
- Prefer clear hierarchy and readable labels over decorative typography.
- Operational tables and forms must remain legible at common laptop widths.

## Grid and spacing

- Public page maximum width: about 1120 px.
- Admin page maximum width: about 1240 px.
- Main spacing rhythm: 6, 8, 10, 12, 16, 20, 24, 32 px.
- Use compact spacing in admin workflows and more breathing room on public pages.

## Components

- Panels use subtle borders, warm or white surfaces, and small 6-8 px radii.
- Primary buttons use teal with clear labels.
- Forms use visible labels and useful validation states.
- Tables may scroll horizontally on narrow screens rather than compressing critical data.
- Portfolio images use consistent aspect ratios and real project photography.

## CTA

- Public CTA must state the next action clearly.
- WhatsApp-oriented actions should be explicit when introduced.
- Admin actions must distinguish read, edit, publish, deploy, and destructive operations.

## Responsive behavior

- Public two-column layouts collapse to one column on mobile.
- Admin controls wrap without hiding actions.
- Important CTA and form controls must remain usable at 320 px width.

## Prohibited

- Generic AI gradients, excessive glow, glassmorphism, or decorative dashboards.
- Unverified claims, invented reviews, fake project photos, and vague marketing copy.
- Changing the current identity without a product reason and a reviewed UI task.

## Good references

- Current public intake and portfolio page in `public/index.html`.
- Current practical admin patterns in `public/admin.html`.
- Live case studies listed in `LIVE_SITES.md`.
