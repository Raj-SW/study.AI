import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectsPanel } from "@/features/projects";
import { DocumentsPanel } from "@/features/documents";
import type { KbStatus } from "@/components/layout/Header";

function App() {
  const [kbStatus, setKbStatus] = useState<KbStatus>("empty");

  return (
    <AppShell
      kbStatus={kbStatus}
      leftPanel={
        <ProjectsPanel>
          {(projectId) => (
            <DocumentsPanel
              projectId={projectId}
              onKbStatusChange={setKbStatus}
            />
          )}
        </ProjectsPanel>
      }
    />
  );
}

export default App;
