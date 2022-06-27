export const logger = console;

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

	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="description" content="A website containing silly things">
		<title>${title}</title>
		<style>${css}</style>
	</head>
	<body>
		<main>
			${body}
		</main>
	</body>
</html>`;
};
