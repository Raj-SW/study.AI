import { Router } from 'express';
import * as projectsController from './projects.controller';
import { validate } from '../../middleware/validate';
import { createProjectSchema } from './projects.schema';

const router = Router();

router.get('/', projectsController.listProjects);
router.post('/', validate(createProjectSchema), projectsController.createProject);

export { router as projectsRouter };
