// Real server-only unconditionally throws -- it only becomes a no-op
// inside Next's own build graph, which Vitest doesn't go through. Aliased
// in place of the real package (see vitest.config.ts) so files that import
// it for its side effect don't blow up outside Next's compiler.
export {};
