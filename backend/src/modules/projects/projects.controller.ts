import { Request, Response, NextFunction } from 'express';
import * as projectsService from './projects.service';
import * as documentsService from '../documents/documents.service';
import { createStorageService } from '../../services/storage';
import { deleteByProject } from '../../services/ingestion/vectorStore';

const storage = createStorageService();

export async function listProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projects = await projectsService.listProjects({ userId: req.user.id });
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await projectsService.createProject({
      name: req.body.name,
      userId: req.user.id,
    });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const userId = req.user.id;

    // Collect all document file paths before cascade-deleting the project
    const filepaths = await documentsService.listDocumentFilepaths(projectId, userId);

    // Delete all vectors for this project from pgvector
    await deleteByProject(projectId);

    // Delete all physical files from storage
    await Promise.all(filepaths.map((fp) => storage.delete(fp)));

    // Delete project from DB — cascades documents and chat messages
    await projectsService.deleteProject(projectId, userId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
