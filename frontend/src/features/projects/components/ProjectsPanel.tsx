import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { ProjectSelect } from "./ProjectSelect";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { useProjects, useSelectedProject } from "../hooks/useProjects";

interface ProjectsPanelProps {
  children?: (selectedProjectId: string | null) => ReactNode;
}

export function ProjectsPanel({ children }: ProjectsPanelProps) {
  const { projects, isLoading, isError, refetch, createProject, isCreating } =
    useProjects();
  const { selectedProject, selectedId, selectProject } =
    useSelectedProject(projects);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async (name: string) => {
    const result = await createProject({ name });
    selectProject(result.project.id);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Projects section */}
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Projects
        </h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDialogOpen(true)}
          aria-label="New project"
        >
          <Plus className="size-4" />
          <span className="sr-only lg:not-sr-only lg:ml-1">New</span>
        </Button>
      </div>

      {isError ? (
        <div className="p-4 text-center">
          <p className="text-sm text-destructive">Failed to load projects</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <ProjectSelect
          projects={projects}
          selectedId={selectedId}
          onSelect={selectProject}
          isLoading={isLoading}
        />
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />

      {/* Documents section rendered via children render prop */}
      {selectedProject && (
        <>
          <Separator />
          {children?.(selectedId)}
        </>
      )}
    </div>
  );
}
