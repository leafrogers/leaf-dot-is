import { importFile, stripSpace } from '../../../helpers.js';

const body = importFile('server/pages/cv/2022/partial.html');
const styles = importFile('server/pages/cv/2022/main.css');

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
	<body>
		${body}
	</body>
</html>`;
};

/**
 * @typedef {BaseUiViewModel} ViewModel
 */

export const ft = `


technologies

- semantic html
- full-stack javascript & typescript
- sass, css
- aria, wcag things
- voiceover on iOS & macOS, JAWS

frameworks & libs

- nodejs & expressjs
- reactjs, redux, mobx
- angular (legacy)
- jest, mocha & chai, sinon

databases

- mongodb
- neo4j

devops & plumbing

- fastly & vcl
- aws lambda, api gateway, s3, ec2, kinesis
- circleci, travis
- heroku
- rabbitmq
- git, github
- vault

services

- kanban-ish
- lucidchart
- sketch?
- sparkpost
- splunk
- webpack





ft.com (next)

NEXT USER ONBOARDING 2 months?

tech used
- nodejs
- expressjs
- mocha & chai
- github, heroku
- akamai
- travis

respon?
- enabling FT readers to opt in and out of using the new website

MYFT 2 years?

tech used
- nodejs
- expressjs
- html
- sass, css
- vanilla js
- reactjs
- webpack
- travis, circleci
- mocha & chai
- fastly & vcl
- neo4j
- sketch?
- github, heroku
- aws lambda
- aws kinesis
- kanban-ish
- splunk

respon?
- developing & updating UI styles
- developing progressively enhanced UI
- migrating old features over to new myFT home
- co-planning, co-architecting, and co-developing new personalised email pipeline for FT readers

1 team award for 7% user engagement boost

A11Y TEAM 1 month?

tech used
- html, aria and wcag magic
- voiceover, jaws, nvda?
- vanilla javascript

respon?
- working with 2 others to get through a list from an a11y audit
- adding focus traps, fixing confusing hierarchies? and missing roles/labels
-

TEASERS 1 month?

tech used
-

respon?
-

EMAIL PLATFORM 4 years?

tech used
- nodejs
- expressjs
- heroku
- aws s3, ec2, lambda
- mocha & chai
- circleci
- rabbitmq
- mongodb
- vault
- sparkpost
- lucidchart
- reactjs
- angular
- fastly & vcl
- splunk

respon?
- deciphered and maintained the FT’s email platform, sending around 10 million news emails per week to FT readers
- tech led a team of 4 to reduce the FT’s email platform down from 44 microservices to around 12
- reduced tech costs of microservices by an order of magnitude
- maintained three 9s reliability
- planned OKRs
- introduced a TTI (time-to-inbox) metric, maintaining at max 5 mins for 90% percentile
- created architecture diagrams, added missing documentation and observability, architected end-to-end testing of the whole platform
- migrated databases and upgraded systems
- line managed and mentored several juniors and mids, and several contractors; all perm staff were promoted during my management. Fortnightly 1:1s for perm, monthly for contractors. Boosted to weekly for the pandemic
- occasional interviewing and onboarding of new staff

Core Skills

- nurtured a safe and blameless working environment
- provided emotional support to various colleagues across different departments
- ran team-bonding chats and events
- shielded juniors from the more stressful parts of everyday work
	- attended and completed an in-person bsl level 1 course, to better communicate with a direct report

EDITORIAL EMAIL 1 year?

tech used
- nodejs
- expressjs
- heroku
- mongodb
- circleci
- vault
- reactjs
- prosemirror
- redux, mobx
- css, sass

respon?
- architected and co-developed a react-based replacement to our FT journalist’s aging angular tool, used daily to author and send news emails to FT customers
`;
