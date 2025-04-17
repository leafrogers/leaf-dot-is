import { attributeName, popoverClassName } from './index.js';

export const relativeTimestampStyles = `
	.${popoverClassName} {
		background: none;
		border: 0;
		border-radius: 100vw;
		color: inherit;
		padding: 0;
		vertical-align: top;

		& svg {
			display: block;
		}
	}

	.${popoverClassName}-target {
		display: none;
	}

	.${popoverClassName}[${attributeName}="true"] + .${popoverClassName}-target {
		background: #08111c;
		border: 5px solid;
		color: #fff0e3;
		display: block;
		padding: 0.5rem;
		position: absolute;
		right: 0;
		text-wrap: nowrap;
	}
`;
