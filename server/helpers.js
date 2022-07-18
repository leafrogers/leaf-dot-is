import fs from 'fs';
import config from './config.js';
import bootstrapper from '../client/bootstrapper.js';

export const logger = console;

/**
 * @param {function} callback
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
	 * @param {number} status
	 * @param {string} message
	 */
	constructor(status, message) {
		super(message);
		this.status = status;
		this.message = message;
	}
}

/**
 * @param {string} string
 */
export const stripSpace = (string) =>
	string.replace(/\n/g, '').replace(/\t/g, '').replace(/\s\s+/g, ' ');

/**
 * @param {object} settings
 * @param {string} settings.body
 * @param {string} [settings.styles] Any styles that are specific to one page
 * @param {string} settings.title
 */
export const toHtmlDocString = ({ body, styles = '', title }) => {
	const css = stripSpace(
		`
			/* Put styles here that are common to all pages */

			/* If common CSS puts most page’s payloads over the 14KB threshold, consider
			 * moving common styles out to a separate CSS file */

			${styles}
		`.trim()
	);

	const enhancer = `\n\t\t<script type="module">${stripSpace(`
			const docEl = document.documentElement;
			const currentScript = document.scripts[document.scripts.length - 1];
			const script = document.createElement('script');

			docEl.classList.remove('core');
			docEl.classList.add('enhanced');

			script.onerror = () => {
				if (docEl.classList.contains('enhanced')) {
					console.warn('Script loading failed. Reverting to core experience.');
					docEl.classList.add('core');
					docEl.classList.remove('enhanced');
				}
			};
			script.async = false;
			script.src = '/js/init.js';

			currentScript.parentNode.insertBefore(script, currentScript);
		</script>`)}`;

	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="description" content="A website containing silly things">
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
		<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
		<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
		<link rel="manifest" href="/site.webmanifest">
		<title>${title}</title>${enhancer}
		<style>${css}</style>
	</head>
	<body>
		<main>
			${body}
		</main>
	</body>
</html>`;
};
