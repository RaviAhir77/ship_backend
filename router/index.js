import productRouter from "./ProductRouter.js"
import unitRouter from "./unitRouter.js"
import packageRouter from "./packageRouter.js"
import quotationRouter from "./quotationRouter.js"
import chartRouter from "./chartRouter.js"
const loadRoute = (app) => {
    app.use('/',quotationRouter)
    app.use('/',packageRouter)
    app.use('/',unitRouter)
    app.use('/',productRouter)
    app.use('/',chartRouter)
}

export default loadRoute