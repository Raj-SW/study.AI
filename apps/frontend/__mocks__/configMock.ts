// Jest stand-in for src/lib/config — that module reads import.meta.env,
// which cannot compile under Jest's CommonJS transform.
export const config = {
  apiBaseUrl: "http://localhost:3001/api",
  userId: "user-1",
} as const;
