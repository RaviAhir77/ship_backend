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

import dotenv from 'dotenv'
dotenv.config()

import { generateAndStorePDF } from '../Config/pdfGenerator.js';

import AWS from 'aws-sdk';
import { S3Client, PutObjectCommand,GetObjectCommand  } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION, 
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY, 
        secretAccessKey: process.env.AWS_SECRET_KEY 
    }
});

const splitProductId = (productIdString) => {
    if (typeof productIdString === "string" && productIdString.includes("-")) {
        const [product_id, variant_id] = productIdString.split("-").map(num => parseInt(num, 10));
        return { product_id, variant_id };
    }
    return { product_id: parseInt(productIdString, 10), variant_id: null };
};



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

        if (req.query.type === 'json') {
            return res.status(200).json({
                message: "Data fetched successfully",
                consignees,
                ports,
                countries,
                currencies,
                products,
                units,
                packages,
                quotations
            });
        }

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

export const getById = async(req,res) => {
    try {
        // const { id } = req.params;
        let quotation = await quotationSchema.findAll({
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

        if (!quotation) {
            return res.status(404).json({ error: "Quotation not found" });
        }

        res.json(quotation);
    } catch (error) {
        console.error("Error fetching quotation:", error);
        res.status(500).json({ error: "Internal Server Error" });
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

        // console.log('full body log :',req.body)

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

        // console.log("Processed Products Array:", products);

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

        // console.log("New Quotation:", newQuotation);

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

            // console.log('quotation products :',quotationProducts)

            await quotationProductSchema.bulkCreate(quotationProducts);
        }

        const fullQuotation = await quotationSchema.findByPk(newQuotation.id, {
            include: [
                {
                    model: quotationProductSchema,
                    include: [
                        { model: productSchema, attributes: ['productName'] },
                        { model: unitSchema, attributes: ['orderUnit', 'packingUnit'] }
                    ]
                },
                { model: consigneeSchema, attributes: ['name', 'address'] },
                { model: countrySchema, attributes: ['country_name'] },
                { model: portSchema, attributes: ['portName'] },
                { model: currencySchema, attributes: ['currency'] }
            ]
        });

        console.log('fullQuotation :',fullQuotation)

        res.status(201).json({ message: "Quotation created successfully", quotation: fullQuotation });
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
        

        const generator = await generateAndStorePDF(id)

         res.json({ message: "PDF generated successfully", s3url : generator });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
}


export const updateQuotation = async(req,res) => {
    try {
        const { id } = req.params;
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

        // Find existing quotation
        const existingQuotation = await quotationSchema.findByPk(id);
        if (!existingQuotation) {
            return res.status(404).json({ error: "Quotation not found" });
        }

        // Update main quotation details
        await quotationSchema.update(
            {
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
            },
            { where: { id } }
        );

        // Process products data
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

        // Delete old products related to this quotation
        await quotationProductSchema.destroy({ where: { quotation_id: id } });

        // Insert new products
        if (products && products.length > 0) {
            const newProducts = products.map(product => {
                let { product_id, variant_id } = splitProductId(product.product_id);

                product_id = parseInt(product_id, 10);
                variant_id = variant_id ? parseInt(variant_id, 10) : null;

                if (isNaN(product_id)) {
                    console.error(`Invalid product_id:`, product.product_id);
                    return null;
                }

                return {
                    quotation_id: id,
                    product_id,
                    variant_id,
                    quantity: parseFloat(product.quantity),
                    price: parseFloat(product.price),
                    total: parseFloat(product.total),
                    totalSingleProduct: parseFloat(product.total),
                    unit_id: parseInt(product.unit_id, 10),
                    net_weight: parseFloat(product.netWeight),
                    gross_weight: parseFloat(product.grossWeight),
                    total_package: parseInt(product.totalPackage, 10),
                    package_id: parseInt(product.package_id, 10)
                };
            });

            await quotationProductSchema.bulkCreate(newProducts);
        }

        // Fetch updated quotation with related data
        const updatedQuotation = await quotationSchema.findByPk(id, {
            include: [
                {
                    model: quotationProductSchema,
                    include: [
                        { model: productSchema, attributes: ["productName"] },
                        { model: unitSchema, attributes: ["orderUnit", "packingUnit"] }
                    ]
                },
                { model: consigneeSchema, attributes: ["name", "address"] },
                { model: countrySchema, attributes: ["country_name"] },
                { model: portSchema, attributes: ["portName"] },
                { model: currencySchema, attributes: ["currency"] }
            ]
        });

        res.json({ message: "Quotation updated successfully", quotation: updatedQuotation });
    } catch (error) {
        console.error("Error updating quotation:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getSignedUrls = async (req, res) => {
    try {
        const { id } = req.params;

        
        let quotation = await quotationSchema.findOne({ where: { id } });

        
        if (!quotation || !quotation.pdf_link) {
            console.log("PDF not found, generating new one...");

            const pdfLink = await generateAndStorePDF(id); 

            if (!pdfLink) {
                return res.status(500).json({ message: "Failed to generate PDF" });
            }

            
            await quotationSchema.update({ pdf_link: pdfLink }, { where: { id } });

            // Fetch the updated quotation
            quotation = await quotationSchema.findOne({ where: { id } });
        }

        // Extract file path from stored S3 URL
        const fileUrl = new URL(quotation.pdf_link);
        const fileName = fileUrl.pathname.substring(1); // Removes leading '/'

        // Generate a signed URL for secure access
        const getObjectParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
        };

        const signedUrl = await getSignedUrl(s3, new GetObjectCommand(getObjectParams), { expiresIn: 3600 });

        return res.json({ signedUrl });
    } catch (error) {
        console.error("Error getting signed URL:", error);
        res.status(500).json({ message: "Error getting signed URL" });
    }
};
