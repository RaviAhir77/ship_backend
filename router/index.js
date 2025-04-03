import productRouter from "./ProductRouter.js"
import unitRouter from "./unitRouter.js"
import packageRouter from "./packageRouter.js"
import quotationRouter from "./quotationRouter.js"
import chartRouter from "./chartRouter.js"
import testRouter from "./testRouter.js"

const loadRoute = (app) => {
    app.use('/',quotationRouter)
    app.use('/',packageRouter)
    app.use('/',unitRouter)
    app.use('/',productRouter)
    app.use('/',chartRouter)
    app.use('/',testRouter)
}

export default loadRoute