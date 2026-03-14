import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../services/projectsApi";
import type { Project } from "../types";
import { toast } from "sonner";
import { useState, useCallback, useEffect } from "react";

const PROJECTS_KEY = ["projects"] as const;
const SELECTED_PROJECT_KEY = "selectedProjectId";

export function useProjects() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: () => projectsApi.list(),
    select: (data) => data.projects,
    retry: 2,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      toast.success(`Project "${data.project.name}" created`);
    },
    onError: () => {
      toast.error("Failed to create project. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      toast.success("Project deleted");
    },
    onError: () => {
      toast.error("Failed to delete project. Please try again.");
    },
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createProject: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteProject: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function useSelectedProject(projects: Project[]) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    // Read from URL first, then localStorage
    const params = new URLSearchParams(window.location.search);
    return params.get("projectId") ?? localStorage.getItem(SELECTED_PROJECT_KEY);
  });

  // Sync to URL and localStorage
  const selectProject = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      localStorage.setItem(SELECTED_PROJECT_KEY, id);
      const url = new URL(window.location.href);
      url.searchParams.set("projectId", id);
      window.history.replaceState({}, "", url);
    } else {
      localStorage.removeItem(SELECTED_PROJECT_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete("projectId");
      window.history.replaceState({}, "", url);
    }
  }, []);

  // Auto-select first project if none selected and projects exist
  useEffect(() => {
    if (!selectedId && projects.length > 0) {
      selectProject(projects[0].id);
    }
    // If selected project no longer exists, clear selection
    if (selectedId && projects.length > 0 && !projects.find((p) => p.id === selectedId)) {
      selectProject(projects[0].id);
    }
  }, [selectedId, projects, selectProject]);

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;

  return { selectedProject, selectedId, selectProject };
}
