# Feature Parts

The parts of the feature named in [current-feature.md](current-feature.md) `## Scope`.
Managed by `/current-feature`; cleared by `complete` once the whole feature is in `main`.

## Next

<!-- Parts planned but not started, in order. Each is a "### Part N: <title>" block with
the notes worked out so far (source, goal, requirements, open questions). `load` moves
the first one into ## Details of current-feature.md. -->

### Part 6: Screens honour the testing menu's `state` param

Source: follows Part 5 (dev testing menu). Goal: each screen built so far reads the
`?state=` search param the menu passes and shows that state, so every menu button lands on
the state it names, as each screen is built. Not Landing: it always runs its real
start-up (decided 2026-11-14). Param name `state`, camelCase values (decided 2026-11-14).
May be folded into each screen's own part instead of a part of its own.

## Done

- 2026-11-14: Part 5: Dev-only testing menu (DevMenu screen and DevButton)
- 2026-11-14: Part 4: Landing start-up: log in on every launch and route to Home, Register or Retry (#9)
- 2026-11-14: Part 3: App state foundations: config, secure storage, device keys, API client (#8)
- 2026-11-14: Part 2: Windows 98 theme, fonts and the first shared UI components (#7)
- 2026-11-13: Part 1: A route and placeholder page for every screen, and the session store (#6)
