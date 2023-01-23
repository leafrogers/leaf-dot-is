/**
 * @typedef NavLink
 * @property {String} text
 * @property {String} url
 *
 * @typedef BaseUiViewModel
 * @property {NavLink[]} navLevels
 * @property {String} title
 *
 * @typedef Weeknote
 * @property {Date} firstPublicationDate
 * @property {String} bodyAsHtml
 * @property {String} titleAsText
 * @property {String} uid
 *
 * @typedef {import('@prismicio/client').Client<import("./types.generated.js").AllDocumentTypes>} PrismicClient
 * @typedef {import('./types.generated.js').WeeknotesDocument} WeeknoteDbDoc
 *
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {Error & { status: number }} ExpressError
 */
