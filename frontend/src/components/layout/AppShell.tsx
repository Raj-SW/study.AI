import type { ReactNode } from "react";
import { Header, type KbStatus } from "./Header";

interface AppShellProps {
  leftPanel?: ReactNode;
  middlePanel?: ReactNode;
  rightPanel?: ReactNode;
  kbStatus?: KbStatus;
}

export function AppShell({ leftPanel, middlePanel, rightPanel, kbStatus }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col">
      <Header kbStatus={kbStatus} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Projects + Documents */}
        <aside className="hidden w-80 shrink-0 border-r lg:flex lg:flex-col">
          {leftPanel}
        </aside>

        {/* Middle panel — Chat/RAG placeholder */}
        <main className="flex flex-1 flex-col">
          {middlePanel ?? <ChatPlaceholder />}
        </main>

        {/* Right panel — Agent/Tools placeholder */}
        <aside className="hidden w-72 shrink-0 border-l xl:flex xl:flex-col">
          {rightPanel ?? <AgentPlaceholder />}
        </aside>
      </div>
    </div>
  );
}

function ChatPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
      <div className="max-w-md space-y-2">
        <p className="text-lg font-medium">Chat with your documents</p>
        <p className="text-sm">
          Upload and index documents to start asking questions.
        </p>
      </div>
    </div>
  );
}

function AgentPlaceholder() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 text-center text-muted-foreground">
      <p className="text-sm">Agent tools coming soon</p>
    </div>
  );
}
