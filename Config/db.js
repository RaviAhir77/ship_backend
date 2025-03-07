import { Sequelize } from "sequelize";

const sequelize = new Sequelize('shipp','root','Ravi@123',{
    host : 'localhost',
    dialect : 'mysql',
    logging : false
})


async function checkConnection(){
    try {
        await sequelize.authenticate()
        console.log('database is a connected successfully ...');
    } catch (error) {
        console.error('error in a database connection',error)
    }
}

checkConnection()

export default sequelize;