import express from 'express';
import compression from 'compression';
import favicon from 'serve-favicon';

import { doNotCache, disallowInProduction, security } from './middleware.js';
import { catchRejections } from './helpers.js';

import { controller as catchErrors } from './pages/error-catch-all.js';
import { controller as notFound } from './pages/error-not-found.js';
import { controller as home } from './pages/home.js';

const app = express();

app.use(security);
app.use(compression());
app.use(favicon('public/favicon.ico'));
app.use(express.static('public'));
app.use(doNotCache);

app.get('/', catchRejections(home));

app.get('/throw-error-in-prod', disallowInProduction);

app.use(catchRejections(notFound));
app.use(catchErrors);

export default app;
