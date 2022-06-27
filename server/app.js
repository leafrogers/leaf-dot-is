import express from 'express';
import helmet from 'helmet';

import { controller as home } from './pages/home.js';

const app = express();

app.use(helmet());

app.get('/', home);

export default app;
