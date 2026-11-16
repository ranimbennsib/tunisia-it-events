require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

const clean = (value) => String(value ?? '').replace(/[\r\n]/g, ' ').trim();

async function sendEmail(to, subject, html) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: clean(subject),
    html,
  });
}

module.exports = { sendEmail };