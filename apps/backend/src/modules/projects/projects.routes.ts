import { Router } from 'express';
import * as projectsController from './projects.controller';
import { validate } from '../../middleware/validate';
import { createProjectSchema, projectIdParamSchema } from './projects.schema';

const router = Router();

router.get('/', projectsController.listProjects);
router.post('/', validate(createProjectSchema), projectsController.createProject);
router.delete('/:projectId', validate(projectIdParamSchema, 'params'), projectsController.deleteProject);

export { router as projectsRouter };
