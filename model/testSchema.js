import { DataTypes } from "sequelize";
import sequelize from "../Config/db.js";

const Test = sequelize.define("Test",{
    id : {
        type : DataTypes.INTEGER,
        allowNull : false,
        autoIncrement : true,
        primaryKey : true
    },
    donor_id : {
        type : DataTypes.INTEGER,
        allowNull : false,
    },
    name : {
        type : DataTypes.STRING,
        allowNull : false
    },
    amount : {
        type : DataTypes.FLOAT,
        allowNull : false
    },
    date : {
        type : DataTypes.DATEONLY,
        allowNull : false
    }
},{
    tableName : 'tests',
    timestamps : false
})

export default Test;