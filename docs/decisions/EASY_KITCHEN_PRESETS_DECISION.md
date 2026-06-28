# EasyKitchen Presets Decision

Date: 2026-06-28
Status: accepted for staged implementation

## Decision

All EasyKitchen preset mappings are declared in a single static allowlist
(`EK_PRESET_MAP` in `kitchen_preset_registry.rb`). The adapter never guesses,
searches, or dynamically loads presets from the EasyKitchen library.

## Rules

1. **Single source of truth** — `EK_PRESET_MAP` is the only place that maps
   domain module keys (e.g. `"sink-base"`, `"base-cabinet"`) to EasyKitchen
   preset IDs, versions, and library names.
2. **Strict by default** — `resolve_ek_preset!(key, strict: true)` raises
   `PresetUnavailableForModule` when a key is not in the map. All production
   paths use `strict: true`.
3. **Demo mode is not for production** — `strict: false` returns `nil` for
   unknown keys, which triggers a block-geometry placeholder. This path is only
   for local smoke tests and is explicitly excluded from production execution.
4. **No guessing** — The adapter never falls back to a "similar" preset, never
   iterates the EasyKitchen library, and never tries to find presets by name
   pattern.
5. **Fail-closed** — If a preset is unavailable in strict mode, the pipeline
   stops with `PresetUnavailableForModule` before creating any artifacts.
   No `model.skp` or `preview.png` is written.

## Architecture

```
Pipeline → build_easykitchen_command(key, cmd, strict: true)
             ↓
           KitchenPresetRegistry.resolve_ek_preset!(key, strict: true)
             ↓
           EK_PRESET_MAP[key]
             ├── found → return { ek_preset_id, version, library }
             └── not found → strict mode → raise PresetUnavailableForModule
                                          → demo mode → return nil → block geometry
```

## Comparison with previous approach

| Before | After |
|--------|-------|
| `presets_for(kind, mode:)` returns array of strings | `resolve_ek_preset!(key, strict:)` returns structured hash or raises |
| No version/library metadata | Each entry includes `ek_preset_id`, `version`, `library` |
| Demo presets filtered from array | `DEMO_PRESET_IDS` explicit allowlist |
| No strict/demo distinction at adapter level | `build_easykitchen_command` requires explicit `strict:` param |

## Testing

- Unit tests for `resolve_ek_preset!` with known/unknown keys and strict/demo modes.
- Integration test "pipeline strict presets" verifies that a missing preset in
  strict mode prevents artifact creation.
