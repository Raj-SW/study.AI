export type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export type CreateProjectRequest = { name: string };
export type CreateProjectResponse = { project: Project };
export type ListProjectsResponse = { projects: Project[] };
