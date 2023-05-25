import { format } from 'date-fns';
import { parse } from 'node-html-parser';
import config from '../../config.js';
import {
	importFile,
	linkifyFootnoteRefs,
	stripFootnoteRefs,
	toHtmlDocString,
	toWeeknoteViewModel
} from '../../helpers.js';
import { fetchWeeknote } from '../../services.js';

const commonCss = importFile('server/pages/common.css');

/**
 * @param {ExpressRequest} req
 * @param {ExpressResponse} res
 * @param {NextFunction} next
 */
export const controller = async (req, res, next) => {
	const { uid } = req.params;
	const weeknote = await fetchWeeknote(uid);

	if (!weeknote) {
		return next();
	}

	const data = {
		...toWeeknoteViewModel(weeknote),
		navLevels: [
			{ text: 'Leaf.is', url: `${config.BASE_URL}/` },
			{ text: 'Writing', url: `${config.BASE_URL}/writing` },
			{ text: 'Weeknotes', url: `${config.BASE_URL}/writing/weeknotes` }
		],
		title: ''
	};

	res.send(view(data));
};

/**
 * @param {ViewModel} settings
 */
const view = ({ bodyAsHtml, date, navLevels, titleAsText }) => {
	const body = parse(bodyAsHtml.replace(...linkifyFootnoteRefs));

	const footnotesHeading = [...body.querySelectorAll('h2')].find(
		(el) => el.textContent === 'Footnotes'
	);

	if (footnotesHeading) {
		footnotesHeading.setAttribute('class', 'footnotes-heading');
		footnotesHeading.innerHTML =
			'<span class="visually-hidden">Footnotes</span>';
	}

	footnotesHeading?.insertAdjacentHTML(
		'beforebegin',
		'<p class="valediction">Yours,<span>Leaf</span></p>'
	);

	const footnotesList = footnotesHeading?.nextElementSibling;
	const footnotesItems = footnotesList?.querySelectorAll('li') || [];

	footnotesItems.forEach((footnote, index) => {
		const oneIndexed = index + 1;
		footnote.setAttribute('id', `footnote-${oneIndexed}`);
		footnote.setAttribute('class', 'footnote');
		footnote.appendChild(
			parse(
				` <a href="#footnote-source-${oneIndexed}" class="footnote-jumpback"><span class="visually-hidden">Jump to source of footnote ${oneIndexed}</span></a>`
			)
		);
	});
	return toHtmlDocString({
		body: `
			${body.toString()}
			<a href="#top" class="toppy"><span class="visually-hidden">Back to top</span>↑</a>
		`,
		header: `
			<p class="published">${format(new Date(date), 'eee do MMM ’yy')}</p>
			<p class="salutation">Dear Internet,</p>
			<h1>${titleAsText.replace(...linkifyFootnoteRefs)}</h1>
		`,
		navLevels,
		styles: `
			${commonCss}
			@font-face {
				font-display: swap;
				font-family: 'Cedarville Cursive Regular';
				font-style: normal;
				font-weight: normal;
				src: url('/fonts/cedarvillecursive-regular.woff2') format('woff2');
			}
			.container {
				padding: 1rem 2rem;
				position: relative;
			}
			.footnotes-heading::before {
				content: '—';
			}
			.footnote:target {
				outline: 2px dotted;
			}
			.footnote-jumpback::before {
				content: '↰';
			}
			.published {
				font-size: 1.2rem;
				margin: 0 10px 0 0;
				right: 4rem;
				top: 1.4rem;
			}
			.salutation {
				margin: 3rem 0 0;
			}
			.valediction {
				margin: 4rem 0 0;
			}
			.valediction span {
				display: block;
				font-family: 'Cedarville Cursive Regular', 'Apfel Grotezk', arial, sans-serif;
				font-size: 4rem;
				margin-top: 1rem;
			}
			.toppy {
				bottom: 0;
				color: white;
				margin: 0 20px -5px 0;
				position: absolute;
				right: 100%;
			}

			@media (min-width: 500px) {
				.published {
					font-size: 1.3rem;
					position: absolute;
				}
			}
			@media (min-width: 600px) {
				.container {
					padding: 1rem 4rem 0;
				}
				.nav-list {
					font-size: 1.3rem;
				}
			}
		`,
		title: titleAsText.replace(...stripFootnoteRefs)
	});
};

/**
 * @typedef {BaseUiViewModel & Weeknote} ViewModel
 */
