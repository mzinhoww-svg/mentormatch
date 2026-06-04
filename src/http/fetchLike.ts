/**
 * Minimal injectable `fetch` seam. Per TESTING.md §5 ("inject seams instead of
 * mocking globals"), HTTP clients take a FetchLike so tests pass a fake instead
 * of stubbing the global `fetch`. Defaults to the global at the call site.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
