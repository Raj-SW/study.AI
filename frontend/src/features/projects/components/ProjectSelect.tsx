import type { Project } from "../types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ProjectSelectProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function ProjectSelect({
  projects,
  selectedId,
  onSelect,
  isLoading,
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
          <Button
            key={project.id}
            role="option"
            aria-selected={project.id === selectedId}
            variant={project.id === selectedId ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-between text-left font-normal",
              project.id === selectedId && "font-medium"
            )}
            onClick={() => onSelect(project.id)}
          >
            <span className="truncate">{project.name}</span>
            {project.id === selectedId && (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
