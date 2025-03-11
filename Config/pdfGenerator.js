import quotationSchema from "../model/quotationSchema.js";
import fs from 'fs'
import path from 'path';
const __dirname = path.resolve();
import puppeteer from 'puppeteer';
import ejs from 'ejs'
import pkg from 'number-to-words';
const {toWords} = pkg

import sequelize from '../Config/db.js';
import consigneeSchema from '../model/consigneeSchema.js';
import countrySchema from '../model/countrySchema.js';
import currencySchema from '../model/currencySchema.js';
import PackageSchema from '../model/packageSchema.js';
import portSchema from '../model/portSchema.js';
import productSchema from '../model/productSchema.js';
import unitSchema from '../model/unitSchema.js';
// import quotationSchema from '../model/quotationSchema.js';
import quotationProductSchema from '../model/quotationProductSchema.js';

import dotenv from 'dotenv'
dotenv.config()

import AWS from 'aws-sdk';
import { S3Client, PutObjectCommand,GetObjectCommand,DeleteObjectCommand  } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION, 
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY, 
        secretAccessKey: process.env.AWS_SECRET_KEY 
    }
});

export const generateAndStorePDF = async (id) => {

    try {
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

        // Generate HTML content from EJS
        const ejsTemplate = fs.readFileSync(path.join(__dirname, "views/pdf.ejs"), "utf-8");
        const htmlContent = ejs.render(ejsTemplate, { quotations: quotationData });

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        // Upload PDF to S3
        const fileName = `quotations/Ravi_${id}.pdf`;
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: pdfBuffer,
            ContentType: "application/pdf",
        };

        await s3.send(new PutObjectCommand(uploadParams));

        // Construct the S3 URL
        const pdfUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${fileName}`;

        // Update quotation record with PDF link
        await quotationSchema.update({ pdf_link: pdfUrl }, { where: { id } });

        return pdfUrl;
    } catch (error) {
        console.error("Error generating and storing PDF:", error);
        return null;
    }
};

export const pdfRemover = async (pdf_link, id) => {
    try {
        if (!pdf_link) {
            console.log("No PDF found to delete.");
            return;
        }

        const fileUrl = new URL(pdf_link);
        const fileName = fileUrl.pathname.substring(1); // Extract file path

        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
        };

        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log("PDF deleted from S3:", fileName);

        await quotationSchema.update({ pdf_link: null }, { where: { id } });

        console.log("PDF link from database.");
    } catch (error) {
        console.error("Error deleting PDF:", error);
    }
};