/**
 * @typedef NavLink
 * @property {String} text
 * @property {String} url
 *
 * @typedef BaseUiViewModel
 * @property {NavLink[]} navLevels
 * @property {String} title
 *
 * @typedef Grooklet
 * @property {string} [title]
 * @property {string} body
 *
 * @typedef Weeknote
 * @property {String} bodyAsHtml
 * @property {Date} date
 * @property {String} titleAsText
 * @property {String} uid
 *
 * @typedef {import('@prismicio/client').Client<import("./types.generated.js").AllDocumentTypes>} PrismicClient
 * @typedef {import('./types.generated.js').WeeknotesDocument} WeeknoteDbDoc
 * @typedef {import('@supabase/supabase-js').SupabaseClient} SupabaseClient
 *
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {Error & { status: number }} ExpressError
 */
