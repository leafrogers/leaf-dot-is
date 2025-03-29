import { importFile, stripSpace } from '../../../helpers.js';
import config from '../../../config.js';

const body = importFile('server/pages/cv/2025/partial.html');
const styles = importFile('server/pages/cv/2025/main.css');

/**
 * @param {ExpressRequest} _req
 * @param {ExpressResponse} res
 */
export const controller = async (_req, res) => {
	const data = {
		navLevels: [],
		title: 'Leaf Rogers'
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ title }) => {
	return `<!DOCTYPE html>
<html lang="en-GB">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="description" content="A website containing silly things">
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
		<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
		<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
		<link rel="manifest" href="/site.webmanifest">
		<title>${title}</title>
		<style>${stripSpace(styles)}</style>
	</head>
	<body${config.IS_PRODUCTION ? '' : ' contenteditable'}>
		${
			config.IS_PRODUCTION
				? ''
				: `
				<script>
					const wrapSelectionWithB = (event) => {
						const selection = document.getSelection();

						if (selection.type !== 'Range') { return; }
						if (event.target.tagName !== 'LI') { return; }

						const range = selection.getRangeAt(0);
						const selectionContents = range.extractContents();
						const b = document.createElement('b');

						b.appendChild(selectionContents);

						range.insertNode(b);
					};

					document.body.addEventListener('click', wrapSelectionWithB);
				</script>`
		}
		${body}
	</body>
</html>`;
};

/**
 * @typedef {BaseUiViewModel} ViewModel
 */
