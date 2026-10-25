import { enGB } from '@/i18n/en-GB';

/**
 * Turns the literal types of the en-GB catalogue into plain shapes: every string becomes
 * `string`, every function keeps its parameters and returns `string`, and every list
 * becomes a readonly list. A second locale must match this shape key for key.
 */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : { readonly [K in keyof T]: Widen<T[K]> };

/** The shape every locale catalogue must satisfy, derived from en-GB. */
export type Messages = Widen<typeof enGB>;

/**
 * The active catalogue. en-GB is the only language at launch (PRODUCT-SPEC §5); a future
 * `fr.ts` exports a `Messages` object and this line picks between them.
 */
export const t: Messages = enGB;
