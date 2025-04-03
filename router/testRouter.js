import { testController,getMonthlySummary } from '../controller/testController.js';

import express from 'express'

const testRouter = express.Router();

testRouter.post('/create',testController)
testRouter.get('/get',getMonthlySummary)

export default testRouter