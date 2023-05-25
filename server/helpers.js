import fs from 'fs';
import { format } from 'prettier';
import { asHTML } from '@prismicio/helpers';
import config from './config.js';
import bootstrapper from '../client/bootstrapper.js';

export const logger = console;

/**
 * @param {Function} callback
 */
export const catchRejections = (callback) => {
	/**
	 * @param {ExpressRequest} req
	 * @param {ExpressResponse} res
	 * @param {NextFunction} next
	 */
	return (req, res, next) => {
		callback(req, res, next).catch(next);
	};
};

export class HttpError extends Error {
	/**
	 * @param {Number} status
	 * @param {String} message
	 */
	constructor(status, message) {
		super(message);
		this.status = status;
		this.message = message;
	}
}

/**
 * @param {String} string
 */
export const stripSpace = (string) =>
	string.replace(/\n/g, '').replace(/\t/g, '').replace(/\s\s+/g, ' ');

/**
 * @param {fs.PathOrFileDescriptor} filePath
 */
export const importFile = (filePath) => {
	if (typeof filePath !== 'string') {
		throw new TypeError(
			`Expected one argument, and expected it to be a file path as a string.`
		);
	}

	return fs.readFileSync(filePath).toString();
};

/**
 * @param {NavLink[]} navLevels
 */
const toHtmlNavString = (navLevels) => {
	return navLevels.length
		? `
		<nav>
			<ol class="nav-list">
				${navLevels
					.map(({ text, url }) => {
						return `<li><a href="${url}">${text}</a></li>`;
					})
					.join('\n')}
			</ol>
		</nav>`
		: '';
};

/**
 * @param {Object} settings
 * @param {String} settings.body
 * @param {String} [settings.header]
 * @param {NavLink[]} settings.navLevels
 * @param {String} [settings.styles]
 * @param {String} settings.title
 */
export const toHtmlDocString = ({
	body,
	header = '',
	navLevels,
	styles = '',
	title
}) => {
	const maybeStyles = styles
		? `\n\t\t<style>${stripSpace(styles)}</style>`
		: '';
	const maybeEnhancer = config.USES_CLIENT_JS
		? `\n\t\t<script type="module">${stripSpace(bootstrapper)}</script>`
		: '';

	return `<!DOCTYPE html>
<html lang="en-GB">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="description" content="${config.APP_FRIENDLY_DESCRIPTION}">
		<meta name="theme-color" content="#fff0e3" media="(prefers-color-scheme: light)">
		<meta name="theme-color" content="#08111c" media="(prefers-color-scheme: dark)">
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
		<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
		<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
		<link rel="manifest" href="/site.webmanifest">
		<link rel="alternate" type="application/rss+xml" href="/writing/weeknotes.rss" title="Weeknotes feed">
		<title>${title} — leaf.is</title>${maybeStyles}${maybeEnhancer}
	</head>
	${format(
		`<body id="top">
			<a href="#main-content" class="visually-hidden focusable">Skip to main content</a>
			<div class="container">
				${toHtmlNavString(navLevels)}
				<header>
				${header || `<h1>${title}</h1>`}
				</header>
				<main id="main-content">
					${body}
				</main>
			</div>
		</body>`,
		{ parser: 'html' }
	)}
</html>`;
};

/**
 * @param {WeeknoteDbDoc} weeknoteDbModel
 * @returns {Weeknote}
 */
export const toWeeknoteViewModel = (weeknoteDbModel) => {
	const bodyAsHtml = asHTML(weeknoteDbModel.data.body);

	return {
		bodyAsHtml,
		date: new Date(
			weeknoteDbModel.data.date || weeknoteDbModel.first_publication_date
		),
		titleAsText: weeknoteDbModel.data.title[0]?.text || '',
		uid: weeknoteDbModel.uid
	};
};

/** @type {[RegExp, (_: any, arg1: string) => string]} **/
export const linkifyFootnoteRefs = [
	/\[(\d+)\]/g,
	(_, footnoteNumber) => {
		return `<sup>[<a href="#footnote-${footnoteNumber}" id="footnote-source-${footnoteNumber}"><span class="visually-hidden">Jump to footnote </span>${footnoteNumber}</a>]</sup>`;
	}
];

/** @type {[RegExp, string]} **/
export const stripFootnoteRefs = [/\[(\d+)\]/g, ''];
