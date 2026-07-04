// Jest stand-in for react-markdown (ESM-only, unparseable under Jest's CJS
// transform). Renders children as plain text — tests assert on content, not
// markdown formatting.
import type { ReactNode } from "react";

export default function ReactMarkdown({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}
