import express from 'express'
import { fetchCharData, renderChart } from '../controller/chartController.js'

const chartRouter = express.Router()

chartRouter.get('/chart',renderChart)
chartRouter.get('/chart/data',fetchCharData)

export default chartRouter;