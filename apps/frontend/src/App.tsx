import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectsPanel } from "@/features/projects";
import { DocumentsPanel } from "@/features/documents";
import { ChatPanel } from "@/features/chat";
import type { KbStatus } from "@/components/layout/Header";

function App() {
  const [kbStatus, setKbStatus] = useState<KbStatus>("empty");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <AppShell
      kbStatus={kbStatus}
      leftPanel={
        <ProjectsPanel onProjectChange={setSelectedProjectId}>
          {(projectId) => (
            <DocumentsPanel
              projectId={projectId}
              onKbStatusChange={setKbStatus}
            />
          )}
        </ProjectsPanel>
      }
      middlePanel={<ChatPanel projectId={selectedProjectId} />}
    />
  );
}

export default App;
