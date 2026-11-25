import type { AtomRegistry } from "effect/reactivity";
import { type AtomCommand, runAtomCommand } from "@t3tools/client-runtime/state/runtime";

// Console reporting would draw over the terminal UI; callers surface failures themselves.
export const runCommand = <W, A, E>(
  registry: AtomRegistry.AtomRegistry,
  command: AtomCommand<W, A, E>,
  input: W,
) => runAtomCommand(registry, command, input, { reportFailure: false, reportDefect: false });
