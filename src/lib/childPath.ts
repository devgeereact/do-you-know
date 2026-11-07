/**
 * Defaults for the child's path. Each is replaced by a parent switch in P4 (docs/DIRECTION.md); until
 * then they are the safe defaults for everyone.
 */
export const childPath = {
  /** Number questions use a tile keypad instead of the slider ("Slider questions" switch, default off). */
  numberTiles: true,
} as const;
