import nodemailer from 'nodemailer';
import dotenv from 'dotenv'
import path from 'path'
dotenv.config();

async function sendMail({ receiverEmail, ccEmail, replyToEmail, emailSubject, emailContent, emailAttachment }) {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NM_EMAIL,
                pass: process.env.NM_PASS
            }
        });

        let mailOptions = {
            from: process.env.NM_EMAIL,
            to: receiverEmail,
            cc: ccEmail || undefined,
            replyTo: replyToEmail || undefined,
            subject: emailSubject,
            text: emailContent, 
            attachments: emailAttachment ? [{
                filename: emailAttachment.filename,
                content: emailAttachment.content 
            }] : []
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, message: 'Failed to send email', error };
    }
}

export default sendMail;