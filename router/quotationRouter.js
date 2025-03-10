import { getform, quotationCreate,getPDF,generatePDF,updateQuotation, getById, getSignedUrls } from '../controller/quotationController.js';
import express from 'express';

const quotationRouter = express.Router();

quotationRouter.get('/quotation',getform)
quotationRouter.get('/quotation/find',getById)
quotationRouter.post('/quotation/create',quotationCreate)
quotationRouter.put('/quotation/update/:id',updateQuotation)
// quotationRouter.get('/quotation/list/:id',listQuotation);
quotationRouter.get('/quotation/pdf/:id',getPDF)
quotationRouter.get('/quotation/generate-pdf/:id',generatePDF);
quotationRouter.get('/quotation/signUrl/:id',getSignedUrls)

export default quotationRouter;