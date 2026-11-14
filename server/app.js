import compression from 'compression';
import express from 'express';
import favicon from 'serve-favicon';
import { catchRejections } from './helpers.js';
import {
	cacheFor,
	disallowInProduction,
	doNotCache,
	doNotCacheErrors,
	security
} from './middleware.js';
import { controller as cv2015 } from './pages/cv/2015/index.js';
import { controller as cv2022 } from './pages/cv/2022/index.js';
import { controller as cv } from './pages/cv/2025/index.js';
import { controller as catchErrors } from './pages/error-catch-all.js';
import { controller as notFound } from './pages/error-not-found.js';
import { controller as home } from './pages/home.js';
import { controller as inhaling } from './pages/inhaling.js';
import { controller as grooklets } from './pages/writing/grooklets.js';
import { controller as writing } from './pages/writing/index.js';
import { controller as weeknote } from './pages/writing/weeknote.js';
import { controller as weeknotes } from './pages/writing/weeknotes.js';
import { controller as weeknotesRss } from './pages/writing/weeknotes-rss.js';

const app = express();
const oneDayInSecs = 60 * 60 * 24;
const oneYearInSecs = oneDayInSecs * 365;

app.use(security);
app.use(compression());
app.use(favicon('public/favicon.ico'));
// express.static needs to be called *before* setting a
// general Cache-Control header, otherwise express.static
// cache options are ignored
app.use(express.static('public', { maxAge: '1 year' }));

const cacheableRoutes = express.Router();

cacheableRoutes.use(cacheFor(oneYearInSecs));

cacheableRoutes.get('/', catchRejections(home));

cacheableRoutes.get('/consuming', (_req, res) =>
	res.redirect(301, '/inhaling')
);
cacheableRoutes.get('/contracting/cv', catchRejections(cv));
cacheableRoutes.get('/contracting/here/is/his/cv', (_req, res) =>
	res.redirect('/contracting/here/is/their/cv')
);
cacheableRoutes.get('/contracting/here/is/their/cv', catchRejections(cv));
cacheableRoutes.get('/contracting/cv/2015', catchRejections(cv2015));
cacheableRoutes.get('/contracting/cv/2022', catchRejections(cv2022));
cacheableRoutes.get('/contracting/cv/2025', catchRejections(cv));
cacheableRoutes.get('/inhaling', catchRejections(inhaling));
cacheableRoutes.get('/inhaling/:eventType', catchRejections(inhaling));
cacheableRoutes.get('/writing', catchRejections(writing));
cacheableRoutes.get('/writing/grooklets', catchRejections(grooklets));
cacheableRoutes.get('/writing/weeknotes', catchRejections(weeknotes));
cacheableRoutes.get('/writing/weeknotes/:uid', catchRejections(weeknote));
cacheableRoutes.get('/writing/weeknotes.rss', catchRejections(weeknotesRss));

app.use(cacheableRoutes);
app.use(doNotCache);

app.get('/throw-error-in-prod', disallowInProduction);

app.use(cacheFor(oneYearInSecs), catchRejections(notFound));
app.use(doNotCacheErrors, catchErrors);

export default app;
