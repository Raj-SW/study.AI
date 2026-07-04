import type { Project } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronRight, Trash2 } from "lucide-react";

interface ProjectSelectProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  onDeleteRequest?: (id: string) => void;
}

export function ProjectSelect({
  projects,
  selectedId,
  onSelect,
  isLoading,
  onDeleteRequest,
}: ProjectSelectProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Create your first project to get started.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2" role="listbox" aria-label="Projects">
        {projects.map((project) => (
          <div
            key={project.id}
            role="option"
            aria-selected={project.id === selectedId}
            className={cn(
              "group flex items-center rounded-md",
              project.id === selectedId ? "bg-secondary" : "hover:bg-accent"
            )}
          >
            <button
              className={cn(
                "flex-1 truncate px-3 py-2 text-left text-sm font-normal",
                project.id === selectedId && "font-medium"
              )}
              onClick={() => onSelect(project.id)}
            >
              {project.name}
            </button>
            {project.id === selectedId && !onDeleteRequest && (
              <ChevronRight className="mr-2 size-4 shrink-0 text-muted-foreground" />
            )}
            {onDeleteRequest && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteRequest(project.id); }}
                aria-label={`Delete ${project.name}`}
                className="mr-1 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
