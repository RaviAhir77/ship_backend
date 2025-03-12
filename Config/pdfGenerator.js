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

import ExcelJs from 'exceljs'
// import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

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

export const excelGenerator = async(id) => {
    try{

        const logoPath = path.join(__dirname, 'public', 'Asset', 'Untitled.jpg');

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

        quotations = quotationData;
    
        // Create a new Excel workbook
        const workbook = new ExcelJs.Workbook();
        const worksheet = workbook.addWorksheet("Quotation");

        const imageId = workbook.addImage({
            filename: logoPath,
            extension: 'jpeg', // or 'png'
        });
        
        worksheet.addImage(imageId, {
            tl: { col: 0.1, row: 0.2 },  // Top-left corner
            ext: { width: 130, height: 70 },  // Image size
            editAs : 'oneCell'
        });

        worksheet.mergeCells('A1:A3');
        
        // Header Information
        const leftHeaderRows = [
            ["QUOTATION NO.", quotations.id],
            ["DATE", quotations.date],
            // [""], // Empty row for spacing
        ];
        
        const rightHeaderRows = [
            ["EXPORTER", "TEST SERVER"],
            ["CONSIGNEE", quotations.Consignee?.name || "N/A"],
            ["CONSIGNEE ADDRESS", quotations.Consignee?.address || "N/A"],
        ];
        
        // Add rows with styles
        leftHeaderRows.forEach((rowData, index) => {
            const row = worksheet.getRow(index + 1);
            
            row.getCell(3).value = rowData[0]; // Column D
            row.getCell(4).value = rowData[1]; // Column E
        
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
        
                if (colNumber === 3) {
                    cell.font = { bold: true, size: 12, color: { argb: "000000" } };
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "D9E1F2" }
                    };
                } else if (colNumber === 4) {
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                    cell.font = { size: 12, color: { argb: "000000" } };
                }
            });
        
            row.height = 20;
        });
        
        // Add right side headers in columns G & H
        rightHeaderRows.forEach((rowData, index) => {
            const row = worksheet.getRow(index + 1);
            
            row.getCell(6).value = rowData[0]; // Column G
            row.getCell(7).value = rowData[1]; // Column H
        
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
        
                if (colNumber === 6) {
                    cell.font = { bold: true, size: 12, color: { argb: "000000" } };
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "D9E1F2" }
                    };
                } else if (colNumber === 7) {
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                    cell.font = { size: 12, color: { argb: "000000" } };
                }
            });
        
            row.height = 20;
        });
        
        worksheet.addRow([]);
    
        // Table Headers
        worksheet.addRow([
          "SR. NO.", "MARKING", "NO. OF PACKAGES", "QTY. TOTAL", "NET W.T.", "GROSS W.T.", 
          `RATE (${quotations.Currency?.currency || "N/A"})`, 
          `TOTAL (${quotations.Currency?.currency || "N/A"})`
        ]).eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFF" } }; // White text
            cell.fill = { 
                type: "pattern", 
                pattern: "solid", 
                fgColor: { argb: "4F81BD" }
            };
            cell.alignment = { horizontal: "center" }; 
            cell.border = { 
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            }; });
    
        // Add Product Rows
        quotations.QuotationProducts.forEach((product, index) => {
          let variantName = "";
          if (product.variant_id) {
            let variant = product.Product.variants.find(v => v.id === product.variant_id);
            if (variant) {
              variantName = " - " + variant.name;
            }
          }
    
          const quotationProductRow = worksheet.addRow([
            index + 1,
            product.Product.productName + variantName,
            product.total_package,
            `${product.quantity} ${product.Unit?.orderUnit || ""}`,
            `${product.net_weight} ${product.Unit?.packingUnit || ""}`,
            `${product.gross_weight} ${product.Unit?.packingUnit || ""}`,
            product.price,
            product.total
          ]);

          quotationProductRow.eachCell((cell, colNumber) => {
            cell.font = { size: 12 }; // Regular font size
            cell.alignment = { horizontal: "center", vertical: "middle" }; // Center text
            cell.border = { // Add border to each cell
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
    
           
            if (index % 2 === 0) { 
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "F2F2F2" } // Light Gray
                };
            } else { // Odd rows (White)
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFFF" } // White
                };
            }
        });
        });
    
        
        worksheet.addRow([]);
        const subtotalRow = worksheet.addRow(["", "", "","TOTAL QTY.", "","", "SUBTOTAL", quotations.total_native]);
        subtotalRow.eachCell((cell, colNumber) => {
            styleCell(cell, colNumber);
        });

        // Row 2 - Discount
        const discountRow = worksheet.addRow(["", "", "", quotations.totalQuantity, "","", "DISCOUNT", "0 %"]);
        discountRow.eachCell((cell, colNumber) => {
            styleCell(cell, colNumber);
        });

        
        const totalFobRow = worksheet.addRow(["", "", "", "", "", "", "TOTAL FOB", quotations.total_native]);
        totalFobRow.eachCell((cell, colNumber) => {
            styleCell(cell, colNumber);
        });

        
        function styleCell(cell, colNumber) {
            cell.font = { bold: true, size: 12 };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };

            if (colNumber === 4 || colNumber === 7) {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFF99" } // Light Yellow
                };
            }
        }
        
    
        const totalWeightSection = [
            ["Total Net Weight", quotations.totalNetWeight],
            ["Total Gross Weight", quotations.totalGrossWeight],
            ["Amount in Words", quotations.total_native_words]
        ];
        
        // Add rows and apply styles
        totalWeightSection.forEach((rowData) => {
            const row = worksheet.addRow(rowData);
            
            row.eachCell((cell, colNumber) => {
                // Apply border to all cells
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
        
                // Apply blue background **only to the first column (labels)**
                if (colNumber === 1) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "4F81BD" } // Blue color
                    };
                    cell.font = { color: { argb: "FFFFFF" }, bold: true }; // White text & bold
                } else {
                    // Normal text for the second column
                    cell.font = { bold: true };
                }
            });
        });
    
        // Format and Auto-size Columns
        worksheet.columns.forEach(column => {
          column.width = 20; // Adjust column width
        });

        const totalRows = worksheet.rowCount;
        const totalCols = 8; 

        
        for (let rowNumber = 1; rowNumber <= totalRows; rowNumber++) {
            const row = worksheet.getRow(rowNumber);

            for (let colNumber = 1; colNumber <= totalCols; colNumber++) {
                const cell = row.getCell(colNumber);

                // Apply thick border only to the outermost cells
                if (rowNumber === 1 || rowNumber === totalRows || colNumber === 1 || colNumber === totalCols) {
                    cell.border = {
                        top: rowNumber === 1 ? { style: "thin" } : { style: "thin" },
                        left: colNumber === 1 ? { style: "thin" } : { style: "thin" },
                        bottom: rowNumber === totalRows ? { style: "thin" } : { style: "thin" },
                        right: colNumber === totalCols ? { style: "thin" } : { style: "thin" }
                    };
                }
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `quotations/Excel-Ravi_${quotations.id}.xlsx`,
            Body: buffer,
            ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",    
        };
        
        await s3.send(new PutObjectCommand(params));
        
        // Construct the S3 URL
        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${params.Key}`;
        
        return fileUrl;
    } catch(error){
        console.log('error in a generating excel', error)
        return null
    }
}

export const simplePdfGenerator = async(id) => {
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

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        return pdfBuffer
    }catch(error){
        console.log('error in a generating a simple pdf : ',error)
        return null;
    }
}