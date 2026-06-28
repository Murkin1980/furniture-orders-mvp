# Launch Readiness Checklist

Date: 2026-06-28
Status: Pending — not yet executed

## LR-01. Public order intake
- [ ] Form opens on desktop
- [ ] Form opens on mobile (320px)
- [ ] Order created successfully
- [ ] Cyrillic saved correctly
- [ ] Phone saved correctly
- [ ] City, furniture type, description, source saved

## LR-02. Calculator lead
- [ ] Calculator opens
- [ ] Parameters saved
- [ ] Estimate, formulaVersion, calculatorMeta saved
- [ ] Order appears in CRM

## LR-03. Admin access
- [ ] No token → no data
- [ ] Invalid token → rejected
- [ ] Valid token → access
- [ ] Public order → no token required
- [ ] Write/ops endpoints protected

## LR-04. CRM manager flow
- [ ] New order visible
- [ ] Status change works
- [ ] Notes saved
- [ ] Follow-up set
- [ ] Today/overdue correct
- [ ] Interaction history preserved
- [ ] Mobile view usable

## LR-05. Proposal lifecycle
- [ ] Create proposal
- [ ] Save v1, save v2
- [ ] Publish
- [ ] Approve
- [ ] Order history updated
- [ ] Printable HTML, print to PDF

## LR-06. Portfolio media
- [ ] Create, upload JPG/PNG/WebP
- [ ] Publish, unpublish
- [ ] Public URL works, missing → 404

## LR-07. Landing publish
- [ ] Create, artifact, deploy
- [ ] Public URL 200
- [ ] Form + calculator create orders

## LR-08. AI manual flow
- [ ] AI analysis runs, error doesn't break order
- [ ] Result visible, no auto-send
- [ ] Re-analysis works

## LR-09. Failure recovery
- [ ] Disabled AI/Twenty/VPS → controlled error
- [ ] Oversized file, empty form, invalid phone → validation error

## LR-10. One-day manager simulation
- [ ] 10 orders (3 kitchen, 3 wardrobe, 2 renovation, 1 children, 1 office)
- [ ] Each: status change, notes, follow-up, proposal or reject, history
