import sequelize from '../Config/db.js';
import consigneeSchema from '../model/consigneeSchema.js';
import countrySchema from '../model/countrySchema.js';
import currencySchema from '../model/currencySchema.js';
import PackageSchema from '../model/packageSchema.js';
import portSchema from '../model/portSchema.js';
import productSchema from '../model/productSchema.js';
import unitSchema from '../model/unitSchema.js';
import quotationSchema from '../model/quotationSchema.js';
import quotationProductSchema from '../model/quotationProductSchema.js';
import sendMail from '../Config/nodeMailer.js';
import Test from '../model/testSchema.js';

import moment from 'moment';



export const testController = async(req,res) => {
    try {
        const data = req.body
        const testCreate = await Test.create(data)
        res.status(200).json({ message: 'data is a created', data : testCreate });
    } catch (error) {
        res.status(500).json({ message: 'server error' });
    }  
}

// export const getMonthlySummary = async (req, res) => {
//     try {
//         // Fetch all transactions
//         const transactions = await Test.findAll({
//             attributes: ["name", "amount", "date"]
//         });

//         // Grouping logic
//         let groupedTransactions = {};

//         transactions.forEach(transaction => {
//             let monthYear = moment(transaction.date).format("YYYY-MM");

//             if (!groupedTransactions[monthYear]) {
//                 groupedTransactions[monthYear] = {
//                     month: monthYear,
//                     total_amount: 0,
//                     transactions: []
//                 };
//             }

//             // Add transaction to the group
//             groupedTransactions[monthYear].transactions.push({
//                 name: transaction.name,
//                 date: transaction.date,
//                 amount: transaction.amount
//             });

//             // Update total amount for the month
//             groupedTransactions[monthYear].total_amount += transaction.amount;
//         });

//         // Convert object to array for better API response
//         const response = Object.values(groupedTransactions);

//         res.json(response);
//     } catch (error) {
//         console.error("Error fetching transactions summary:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// };

export const getMonthlySummary = async (req, res) => {
    try {
        // Fetch all transactions
        const transactions = await Test.findAll({
            attributes: ["name", "amount", "date"]
        });

        // Grouping logic
        let groupedTransactions = {};

        transactions.forEach(transaction => {
            let monthYear = moment(transaction.date).format("YYYY-MM");

            if (!groupedTransactions[monthYear]) {
                groupedTransactions[monthYear] = {
                    month: monthYear,
                    total_amount: 0,
                    name: transaction.name // Since the name is always "ravi", we assign it once
                };
            }

            // Add transaction amount to the total sum
            groupedTransactions[monthYear].total_amount += transaction.amount;
        });

        // Convert object to array for API response
        const response = Object.values(groupedTransactions);

        res.json(response);
    } catch (error) {
        console.error("Error fetching transactions summary:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};