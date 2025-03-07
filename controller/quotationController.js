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

import fs from 'fs'
import path from 'path';
const __dirname = path.resolve();
import puppeteer from 'puppeteer';
import ejs from 'ejs'
import pkg from 'number-to-words';
const {toWords} = pkg

const splitProductId = (productIdString) => {
    if (typeof productIdString === "string" && productIdString.includes("-")) {
        const [product_id, variant_id] = productIdString.split("-").map(num => parseInt(num, 10));
        return { product_id, variant_id };
    }
    return { product_id: parseInt(productIdString, 10), variant_id: null };
};


// export const getAllDetails = async(req,res) => {
//     try {
//         const quotations = await sequelize.query(
//             `SELECT 
//                 q.id, 
//                 q.date,
//                 c.name AS consignee_name, 
//                 c.address AS consignee_address, 
//                 p.portName AS port_name, 
//                 co.country_name, 
//                 cur.currency AS currency_name, 
//                 cur.conversion_rate,
//                 pr.productName AS product_name, 
//                 pr.sellPrice AS Price,
//                 u.orderUnit AS orderUnit,
//                 u.packingUnit AS packingUnit,
//                 pk.netWeight AS netWeight,
//                 pk.grossWeight AS grossWeight
//             FROM quotations q
//             LEFT JOIN consignees c ON c.id = q.consignee_id
//             LEFT JOIN ports p ON p.id = q.port_id
//             LEFT JOIN countries co ON co.id = q.country_id
//             LEFT JOIN currencies cur ON cur.id = q.currency_id
//             LEFT JOIN products pr ON pr.id = q.product_id
//             LEFT JOIN units u ON u.id = q.unit_id
//             LEFT JOIN packages pk ON pk.id = q.package_id`,
//             { type: sequelize.QueryTypes.SELECT }
//         );

//         res.json(quotations);
//     } catch (error) {
//         console.error("Error fetching quotations:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// }

export const getform = async(req,res) => {
    try {
        // Fetch data from related tables to populate dropdowns
        const consignees = await consigneeSchema.findAll();
        const ports = await portSchema.findAll();
        const countries = await countrySchema.findAll();
        const currencies = await currencySchema.findAll();
        const products = await productSchema.findAll();
        const units = await unitSchema.findAll();
        const packages = await PackageSchema.findAll();

        let quotations = await quotationSchema.findAll({
            include: [
                {
                    model: quotationProductSchema,
                    include: [
                        { model: productSchema, attributes: ['productName', 'variants'] },
                        { model: unitSchema, attributes: ['orderUnit', 'packingUnit'] },
                    ],
                },
                { model: consigneeSchema, attributes: ['name','address'] },
                { model: countrySchema, attributes: ['country_name'] },
                { model: portSchema, attributes: ['portName'] },
                { model: currencySchema, attributes: ['currency'] },
            ],
        });


        res.render('quotation', {
            consignees,
            ports,
            countries,
            currencies,
            products,
            units,
            packages,
            quotations
        });
    } catch (error) {
        console.error("Error fetching data for quotation form:", error);
        res.status(500).send("Internal Server Error");
    }
}


export const quotationCreate = async(req,res) => {
    try {
        let {
            date,
            consignee_id,
            country_id,
            port_id,
            currency_id,
            conversion_rate,
            totalNetWeight,
            totalGrossWeight,
            total_native,
            total_inr,
            products,
            product_id,
            quantity,
            price,
            total,
            unit_id,
            netWeight,
            grossWeight,
            totalPackage,
            package_id
        } = req.body;

        console.log('full body log :',req.body)

        if (!products || !Array.isArray(products)) {

            if (!Array.isArray(product_id)) {
                product_id = [product_id];
                quantity = [quantity];
                price = [price];
                total = [total];
                unit_id = [unit_id];
                netWeight = [netWeight];
                grossWeight = [grossWeight];
                totalPackage = [totalPackage];
                package_id = [package_id];
            }

            products = product_id.map((id, index) => ({
                product_id: id,
                quantity: quantity[index],
                price: price[index],
                total: total[index],
                unit_id: unit_id[index],
                netWeight: netWeight[index],
                grossWeight: grossWeight[index],
                totalPackage: totalPackage[index],
                package_id: package_id[index]
            }));
        }

        console.log("Processed Products Array:", products);

        const newQuotation = await quotationSchema.create({
            date,
            consignee_id,
            country_id,
            port_id,
            currency_id,
            conversion_rate,
            totalNetWeight,
            totalGrossWeight,
            total_native,
            total_inr
        });

        console.log("New Quotation:", newQuotation);

        // console.log('new quotation : ',newQuotation)
        if (products && Array.isArray(products) && products.length > 0) {
            const quotationProducts = products.map(product => {
                let { product_id, variant_id } = splitProductId(product.product_id); 

                product_id = parseInt(product_id, 10);
                variant_id = variant_id ? parseInt(variant_id, 10) : null;

                
                if (isNaN(product_id)) {
                    console.error(`Invalid product_id at index ${index}:`, product.product_id);
                    return null; // Skip this entry
                }

                return {
                    quotation_id: newQuotation.id,
                    product_id,
                    variant_id, 
                    quantity: parseFloat(product.quantity),
                    price: parseFloat(product.price),
                    total : parseFloat(product.total),
                    totalSingleProduct: parseFloat(product.total),
                    unit_id: parseInt(product.unit_id, 10),
                    net_weight: parseFloat(product.netWeight),
                    gross_weight: parseFloat(product.grossWeight),
                    total_package: parseInt(product.totalPackage, 10),
                    package_id: parseInt(product.package_id, 10)
                };
            });

            console.log('quotation products :',quotationProducts)

            await quotationProductSchema.bulkCreate(quotationProducts);
        }

        res.status(201).json({ message: "Quotation created successfully", quotation: newQuotation });
    } catch (error) {
        console.error("Error creating quotation:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// export const listQuotation = async(req,res) => {
    
//     try{
//         const { id } = req.params;
//         let quotation = await quotationSchema.findOne({
//             where: { id }, 
//             include: [
//                 {
//                     model: quotationProductSchema,
//                     include: [
//                         { model: productSchema, attributes: ['productName', 'variants'] },
//                         { model: unitSchema, attributes: ['orderUnit', 'packingUnit'] },
//                     ],
//                 },
//                 { model: consigneeSchema, attributes: ['name'] },
//                 { model: countrySchema, attributes: ['country_name'] },
//                 { model: portSchema, attributes: ['portName'] },
//                 { model: currencySchema, attributes: ['currency'] },
//             ],
//         });

//         if (!quotation) {
//             return res.status(404).json({ message: 'Quotation not found' });
//         }

//         const quotationData = quotation.toJSON();

//         // ✅ Calculate total quantity
//         quotationData.totalQuantity = quotationData.QuotationProducts.reduce((sum, product) => {
//             return sum + parseFloat(product.quantity);
//         }, 0);

//         // ✅ Keep the original number and also store words
//         quotationData.total_native_words = toWords(Number(quotationData.total_native)) + " " + quotationData.Currency.currency + " ONLY"; // In words

//         res.render('partial/_ListQuotation',{quotation: quotationData }) ;
//     } catch (error) {
//         console.error('Error fetching quotations:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// }

export const getPDF = async(req,res) => {
        const {id} = req.params
    try {
        let quotations = await quotationSchema.findOne({
            where : {id},
            include: [
                {
                    model: quotationProductSchema,
                    include: [
                        { model: productSchema, attributes: ['productName','variants'] },
                        { model: unitSchema, attributes: ['orderUnit','packingUnit'] },
                    ],
                   
                },
                { model: consigneeSchema, attributes: ['name','address'] }, // Fetch consignee name
                { model: countrySchema, attributes: ['country_name'] }, // Fetch country name
                { model: portSchema, attributes: ['portName'] }, // Fetch port name
                { model: currencySchema, attributes: ['currency'] },
            ],
        });
        const quotationData = quotations.toJSON();

        // ✅ Calculate total quantity
        quotationData.totalQuantity = quotationData.QuotationProducts.reduce((sum, product) => {
            return sum + parseFloat(product.quantity);
        }, 0);

        // ✅ Keep the original number and also store words
        quotationData.total_native_words = toWords(Number(quotationData.total_native)) + " " + quotationData.Currency.currency + " ONLY"; // In words
        res.render('pdf',{quotations : quotationData})
    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
    
}


export const generatePDF = async(req,res) => {
    try{
        const { id } = req.params;
        let quotations = await quotationSchema.findOne({
            where: { id }, 
            include: [
                {
                    model: quotationProductSchema,
                    include: [
                        { model: productSchema, attributes: ['productName', 'variants'] },
                        { model: unitSchema, attributes: ['orderUnit', 'packingUnit'] },
                    ],
                },
                { model: consigneeSchema, attributes: ['name','address'] },
                { model: countrySchema, attributes: ['country_name'] },
                { model: portSchema, attributes: ['portName'] },
                { model: currencySchema, attributes: ['currency'] },
            ],
        });

        if (!quotations) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        const quotationData = quotations.toJSON();

        
        quotationData.totalQuantity = quotationData.QuotationProducts.reduce((sum, product) => {
            return sum + parseFloat(product.quantity);
        }, 0);

        
        quotationData.total_native_words = toWords(Number(quotationData.total_native)) + " " + quotationData.Currency.currency + " ONLY"; // In words

        const ejsTemplate = fs.readFileSync(path.join(__dirname, "views/pdf.ejs"), "utf-8");
        const htmlContent = ejs.render(ejsTemplate,{quotations : quotationData});


        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            dumpio: true,
        });
        const page = await browser.newPage();

        await page.setContent(htmlContent, {
            waitUntil: "networkidle0"
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true
        });

        console.log("PDF Buffer Length:", pdfBuffer.length);

        await browser.close();

        res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);


        res.end(pdfBuffer,'binary');

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
}