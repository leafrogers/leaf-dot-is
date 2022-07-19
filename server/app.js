import express from 'express';
import compression from 'compression';
import favicon from 'serve-favicon';

import {
	cacheFor,
	doNotCache,
	disallowInProduction,
	security
} from './middleware.js';
import { catchRejections } from './helpers.js';

import { controller as catchErrors } from './pages/error-catch-all.js';
import { controller as notFound } from './pages/error-not-found.js';
import { controller as home } from './pages/home.js';

const app = express();
const oneDayInMs = 60 * 60 * 24;
const oneMonthInMs = oneDayInMs * 30;

app.use(security);
app.use(compression());
app.use(favicon('public/favicon.ico'));
// express.static needs to be called *before* setting a
// general Cache-Control header, otherwise express.static
// cache options are ignored
app.use(express.static('public', { maxAge: '1 month' }));

const cacheableRoutes = express.Router();

cacheableRoutes.use(cacheFor(oneMonthInMs));

cacheableRoutes.get('/', catchRejections(home));

app.use(cacheableRoutes);
app.use(doNotCache);

app.get('/throw-error-in-prod', disallowInProduction);

app.use(cacheFor(oneMonthInMs), catchRejections(notFound));
app.use(catchErrors);

export default app;
