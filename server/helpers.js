import fs from 'fs';
import { format } from 'prettier';
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
 * @param {Object} settings
 * @param {String} settings.body
 * @param {String} [settings.styles]
 * @param {String} settings.title
 */
export const toHtmlDocString = ({ body, styles = '', title }) => {
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
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
		<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
		<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
		<link rel="manifest" href="/site.webmanifest">
		<title>${title} — leaf.is</title>${maybeStyles}${maybeEnhancer}
	</head>
	${format(
		`<body>
			<div class="container">
				<main>
					${body}
				</main>
			</div>
		</body>`,
		{ parser: 'html' }
	)}
</html>`;
};
