import express from 'express';
import helmet from 'helmet';

import { disallowInProduction } from './middleware.js';
import compression from 'compression';

import { catchRejections } from './helpers.js';

import { controller as catchErrors } from './pages/error-catch-all.js';
import { controller as notFound } from './pages/error-not-found.js';
import { controller as home } from './pages/home.js';

const app = express();

app.use(helmet());
app.use(compression());

app.get('/', catchRejections(home));

app.get('/throw-error-in-prod', disallowInProduction);

app.use(catchRejections(notFound));
app.use(catchErrors);

export default app;
