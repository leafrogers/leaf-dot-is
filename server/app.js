import express from 'express';
import helmet from 'helmet';

const app = express();

app.use(helmet());
app.get('/', ({ res }) => res.sendStatus(200));

export default app;
