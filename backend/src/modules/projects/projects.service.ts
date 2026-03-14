import { prisma } from '../../lib/prisma';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { CreateProjectInput, ListProjectsInput, ProjectResponse } from './projects.types';

function toResponse(project: { id: string; name: string; createdAt: Date }): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
  };
}

export async function listProjects(input: ListProjectsInput): Promise<ProjectResponse[]> {
  const projects = await prisma.project.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: 'desc' },
  });
  return projects.map(toResponse);
}

export async function createProject(input: CreateProjectInput): Promise<ProjectResponse> {
  try {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        userId: input.userId,
      },
    });
    return toResponse(project);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      throw new ConflictError(`Project with name '${input.name}' already exists`);
    }
    throw err;
  }
}

export async function getProjectById(
  projectId: string,
  userId: string,
): Promise<ProjectResponse> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
  });

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  return toResponse(project);
}

export async function verifyProjectOwnership(
  projectId: string,
  userId: string,
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }
}

export async function deleteProject(
  projectId: string,
  userId: string,
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Cascades documents and chat messages in DB (onDelete: Cascade in schema)
  await prisma.project.delete({ where: { id: projectId } });
}
