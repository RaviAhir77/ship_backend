import { getform, quotationCreate,getPDF,generatePDF } from '../controller/quotationController.js';
import express from 'express';

const quotationRouter = express.Router();

quotationRouter.get('/quotation',getform)
quotationRouter.post('/quotation/create',quotationCreate)
// quotationRouter.get('/quotation/list/:id',listQuotation);
quotationRouter.get('/quotation/pdf/:id',getPDF)
quotationRouter.get('/quotation/generate-pdf/:id',generatePDF)
export default quotationRouter;