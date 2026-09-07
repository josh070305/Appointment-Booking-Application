import { Router } from 'express';
import { parseAssistantQuery } from '../controllers/assistantController.js';

const router = Router();

router.post('/parse', parseAssistantQuery);

export default router;
