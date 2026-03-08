// API base URL pointing at the local backend dev server.
// In test environments, this module can be mocked.
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api",
  userId: import.meta.env.VITE_USER_ID || "user-1",
} as const;
