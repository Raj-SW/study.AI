import { Request, Response, NextFunction } from 'express';
import * as projectsService from './projects.service';

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
