import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { ProjectSelect } from "./ProjectSelect";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { useProjects, useSelectedProject } from "../hooks/useProjects";

interface ProjectsPanelProps {
  onProjectChange?: (id: string | null) => void;
  children?: (selectedProjectId: string | null) => ReactNode;
}

export function ProjectsPanel({ onProjectChange, children }: ProjectsPanelProps) {
  const { projects, isLoading, isError, refetch, createProject, isCreating, deleteProject, isDeleting } =
    useProjects();
  const { selectedProject, selectedId, selectProject } =
    useSelectedProject(projects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteProject = projects.find((p) => p.id === pendingDeleteId);

  useEffect(() => {
    onProjectChange?.(selectedId);
  }, [selectedId, onProjectChange]);

  const handleCreate = async (name: string) => {
    const result = await createProject({ name });
    selectProject(result.project.id);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    await deleteProject(pendingDeleteId);
    setPendingDeleteId(null);
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
          onDeleteRequest={setPendingDeleteId}
        />
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />

      <Dialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{pendingDeleteProject?.name}&rdquo;?{" "}
              This will permanently remove all its documents and chat history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
