import express from 'express';
import helmet from 'helmet';

import { catchRejections } from './helpers.js';

import { controller as home } from './pages/home.js';

const app = express();

app.use(helmet());

app.get('/', catchRejections(home));

export default app;
