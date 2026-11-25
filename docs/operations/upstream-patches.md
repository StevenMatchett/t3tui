# Upstream patch ledger

This ledger covers fork changes to files inherited from T3 Code. New files under `apps/tui` and
TUI-only documentation do not need entries. Update an entry when an upstream merge changes its
conflict risk or makes it unnecessary.

The ledger lives under operations because it is part of the fork maintenance runbook.

`UP-004` supplies a direct-only `RemoteEnvironmentAuthorization` because the connection driver
requires that service even though a direct bearer connection only uses its descriptor cache.

| ID       | Category     | Paths                                                   | Reason                                                                                   | Upstreamable | Upstream PR | Conflict risk | Removal condition                                                  |
| -------- | ------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------ | ----------- | ------------- | ------------------------------------------------------------------ |
| `UP-001` | Branding     | `README.md`                                             | Identify the unaffiliated fork and document prototype usage and artifacts.               | No           | N/A         | Low           | The repository stops being a public fork.                          |
| `UP-002` | Build policy | `package.json`                                          | Check that fork history descends from the recorded full upstream SHA.                    | No           | N/A         | Low           | The fork adopts another enforced provenance mechanism.             |
| `UP-003` | TUI package  | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Register the TUI workspace, renderer pins, and shared runtime dependencies.              | No           | N/A         | Medium        | The fork drops the TUI client or upstream adds the same workspace. |
| `UP-004` | Runtime API  | `packages/client-runtime/src/connection/layer.ts`       | Add `Connection.layerWithResolver` so the TUI reuses sessions without cloud or SSH auth. | Yes          | N/A         | Low           | Upstream exposes the same composition point.                       |
| `UP-005` | Protocol     | `packages/client-runtime/src/rpc/session.ts`            | Accept an injected protocol client so the TUI can also speak to V1 servers.              | Yes          | N/A         | Low           | The TUI drops V1 server support.                                   |
| `UP-006` | Wire compat  | `packages/contracts/src/keybindings.ts`                 | Drop unknown keybinding commands inside RPC responses instead of failing.                | Yes          | N/A         | Low           | Upstream's RPC decoding drops unknown keybinding rules itself.     |
| `UP-007` | Lint config  | `knip.jsonc`                                            | Declare the TUI package main, CLI binary, and scripts as knip entries.                   | No           | N/A         | Low           | The fork drops the TUI client.                                     |
