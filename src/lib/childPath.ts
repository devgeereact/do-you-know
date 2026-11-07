/**
 * Defaults for the child's path before a parent has chosen anything. Since P4 the live values come from the
 * parent's switches (src/hooks/useSwitches.ts, docs/DIRECTION.md); this file is kept as the record of the defaults.
 */
export const childPath = {
  /** Number questions use a tile keypad instead of the slider ("Slider questions" switch, default off). */
  numberTiles: true,
} as const;
