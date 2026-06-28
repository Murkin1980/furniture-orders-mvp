# API Access Matrix

Date: 2026-06-28
Status: Active

| Endpoint | Method | Scope | Token | Test | Status |
|----------|--------|-------|-------|------|--------|
| `/api/orders` | POST | public | no | ✅ | public intake |
| `/api/orders` | GET | read | yes | ✅ | list orders |
| `/api/orders/status` | POST | write | yes | ✅ | update status |
| `/api/order-interactions` | GET | read | yes | ✅ | history |
| `/api/order-interactions` | POST | write | yes | ✅ | add interaction |
| `/api/order-steps` | GET | read | yes | ✅ | project steps |
| `/api/order-steps/update` | POST | write | yes | ✅ | update step |
| `/api/calculators` | GET | read | yes | ✅ | list |
| `/api/calculators` | POST | write | yes | ✅ | create |
| `/api/calculators/:id/embed` | GET | public | no | ✅ | embed widget |
| `/api/calculators/:id/lead` | POST | public | no | ✅ | calculator lead |
| `/api/calculators/:id/pricing` | GET/PUT | write | yes | ✅ | pricing |
| `/api/calculators/:id/rules` | GET/PUT | write | yes | ✅ | rules |
| `/api/calculators/:id/publish` | POST | write | yes | ✅ | publish |
| `/api/proposals` | GET/POST | write | yes | ✅ | lifecycle |
| `/api/proposals/:id` | GET | write | yes | ✅ | detail |
| `/api/proposals/:id/publish` | POST | write | yes | ✅ | publish |
| `/api/proposals/:id/approve` | POST | write | yes | ✅ | approve |
| `/api/proposals/preview` | POST | write | yes | ✅ | preview |
| `/api/portfolio` | GET | public/read | no/yes | ✅ | list |
| `/api/portfolio` | POST | write | yes | ✅ | create |
| `/api/portfolio/:id` | PUT | write | yes | ✅ | update |
| `/api/portfolio/:id/publish` | POST | write | yes | ✅ | publish |
| `/api/portfolio/:id/images/upload` | POST | write | yes | ✅ | upload |
| `/api/sites` | GET/POST | write | yes | ✅ | sites |
| `/api/sites/:id/deploy` | POST | ops | yes | ✅ | deploy |
| `/api/vps/health` | GET | read | yes | ✅ | VPS health |
| `/api/vps/services` | GET | read | yes | ✅ | VPS services |
| `/api/vps/deploy/site` | POST | ops | yes | ✅ | VPS deploy |
| `/api/vps/reload/webserver` | POST | ops | yes | ✅ | reload |
| `/api/communication-drafts` | GET/POST | write | yes | ✅ | drafts |
| `/api/orders/:id/ai/analyze` | POST | write | yes | ✅ | AI analyze |
| `/api/orders/:id/ai/suggest-reply` | POST | write | yes | ✅ | AI reply |
| `/api/orders/:id/agent/hermes` | POST | write | yes | ✅ | Hermes |
| `/api/orders/:id/crm/twenty` | POST | write | yes | ✅ | Twenty sync |
| `/api/orders/:id/ocr/recognize` | POST | write | yes | ✅ | OCR |
| `/api/orders/:id/sketchup/jobs` | POST | ops | yes | ✅ | SketchUp |
| `/api/orders/:id/pdf/analyze` | POST | write | yes | ✅ | PDF |
| `/api/orders/:id/pdf/drafts` | GET/POST | write | yes | ✅ | PDF drafts |
