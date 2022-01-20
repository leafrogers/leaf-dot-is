import express from 'express';
import helmet from 'helmet';

const app = express();

/**
 * @param {object} _
 * @param {express.Response} _.res
 */
const exampleController = ({ res }) => {
	res.sendStatus(200);
};

app.use(helmet());
app.get('/', exampleController);

export default app;
