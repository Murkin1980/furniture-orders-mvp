# SketchUp Slice 13B File Queue Summary

## Result

The local Windows service now has a disabled-by-default bridge to a future
SketchUp 2026 Ruby adapter. After signed-job validation and matching manager
approval, it writes a versioned command plan atomically to a local inbox and
waits for a matching safe SKP result in the outbox.

## Safety

- No process spawning, Ruby execution, SketchUp automation, or rendering.
- Absolute queue directory and constrained job IDs are required.
- Manager identity and matching approval remain mandatory.
- Only relative `artifacts/...` SKP references are accepted.
- EasyKitchen Demo remains a locally installed licensed adapter candidate; its
  assets are not copied to Git, D1, or R2.
- Default service mode remains dry-run.

## Checks

- `npm.cmd --prefix sketchup-node-service run check`: passed.
- `npm.cmd --prefix sketchup-node-service test`: passed, 22 tests.
- `npm.cmd run check`: passed.
- `npm.cmd test`: passed, 431 tests.

## Next

Implement and review the separate Ruby queue consumer with a tiny allowlisted
test component before enabling execution for a real job.
