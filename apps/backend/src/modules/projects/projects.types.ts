export interface ProjectResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  userId: string;
}

export interface ListProjectsInput {
  userId: string;
}
