import { httpClient } from "@/lib/http";
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  ListProjectsResponse,
} from "../types";

export const projectsApi = {
  list(): Promise<ListProjectsResponse> {
    return httpClient.get<ListProjectsResponse>("/projects");
  },

  create(data: CreateProjectRequest): Promise<CreateProjectResponse> {
    return httpClient.post<CreateProjectResponse>("/projects", { body: data });
  },
};
