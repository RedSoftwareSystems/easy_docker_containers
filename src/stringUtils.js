"use strict";

// Case-insensitive comparison first, falling back to a case-sensitive
// comparison so ordering is stable when two strings only differ in case.
export const compareStrings = (a, b) => {
  const baseCompare = a.localeCompare(b, undefined, { sensitivity: "base" });
  if (baseCompare !== 0) return baseCompare;

  return a.localeCompare(b);
};
