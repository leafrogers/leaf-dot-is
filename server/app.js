import express from 'express';
import compression from 'compression';
import favicon from 'serve-favicon';

import {
	cacheFor,
	disallowInProduction,
	doNotCache,
	security
} from './middleware.js';
import { catchRejections } from './helpers.js';

import { controller as catchErrors } from './pages/error-catch-all.js';
import { controller as cv } from './pages/cv/2022/index.js';
import { controller as cv2015 } from './pages/cv/2015/index.js';
import { controller as grooklets } from './pages/writing/grooklets.js';
import { controller as home } from './pages/home.js';
import { controller as notFound } from './pages/error-not-found.js';
import { controller as weeknote } from './pages/writing/weeknote.js';
import { controller as weeknotes } from './pages/writing/weeknotes.js';
import { controller as weeknotesRss } from './pages/writing/weeknotes-rss.js';
import { controller as writing } from './pages/writing/index.js';

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

cacheableRoutes.get('/writing', catchRejections(writing));
cacheableRoutes.get('/writing/grooklets', catchRejections(grooklets));
cacheableRoutes.get('/writing/weeknotes', catchRejections(weeknotes));
cacheableRoutes.get('/writing/weeknotes/:uid', catchRejections(weeknote));
cacheableRoutes.get('/writing/weeknotes.rss', catchRejections(weeknotesRss));

cacheableRoutes.get('/contracting/cv', catchRejections(cv));
cacheableRoutes.get('/contracting/here/is/his/cv', catchRejections(cv));
cacheableRoutes.get('/contracting/cv/2015', catchRejections(cv2015));

app.use(cacheableRoutes);
app.use(doNotCache);

app.get('/throw-error-in-prod', disallowInProduction);

app.use(cacheFor(oneYearInSecs), catchRejections(notFound));
app.use(catchErrors);

export default app;
