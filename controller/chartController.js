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
import { Op } from 'sequelize';


export const renderChart = async(req,res) => {
    res.render('chart')
}

const getAllDaysInMonth = (year, month) => {
    const dateList = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        dateList.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    return dateList;
};

export const fetchCharData = async(req,res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const month = req.query.month || new Date().getMonth() + 1;

        const quotations = await quotationSchema.findAll({
            attributes: ['date', 'total_inr'],
            where: {
                date: {
                    [Op.between]: [`${year}-${month}-01`, `${year}-${month}-31`]
                }
            },
            raw: true
        });

        const allDates = getAllDaysInMonth(year, month);
        const dataMap = {};
        allDates.forEach(date => dataMap[date] = 0);

        quotations.forEach(q => {
            const date = new Date(q.date).toISOString().split('T')[0];
            dataMap[date] += parseFloat(q.total_inr);
        });

        res.json({
            labels: allDates,
            datasets: [{
                label: 'Total Order Price',
                data: Object.values(dataMap),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}