import { useEffect, useRef } from "react";
import type { PluginHost } from "../types";

/** Own one settings mutation until it settles or its mounted Host changes. */
export function useSettingsMutationOwner(host: PluginHost) {
  const state = useRef({ active: true, epoch: 0, busy: false });
  useEffect(() => {
    const value = state.current; value.active = true; value.busy = false;
    return () => { value.active = false; value.epoch += 1; };
  }, [host]);
  return {
    acquire(): number | undefined {
      const value = state.current;
      if (!value.active || value.busy) return undefined;
      value.busy = true; return value.epoch;
    },
    current(epoch: number): boolean { return state.current.active && state.current.epoch === epoch; },
    release(epoch: number): boolean {
      const value = state.current;
      if (!value.active || value.epoch !== epoch) return false;
      value.busy = false; return true;
    },
  };
}

export type SettingsMutationOwner = ReturnType<typeof useSettingsMutationOwner>;
