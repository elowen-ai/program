import 'dotenv/config'
import nodemailer from 'nodemailer'

export const sendErrorMail = async (subject: string, message: string) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })

    await transporter.sendMail({
        from: '"Elowen Program Logger" <' + process.env.SMTP_FROM + '>',
        to: process.env.SMTP_TO,
        subject,
        text: message
    })
}
