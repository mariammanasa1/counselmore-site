import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Load .env
dotenv.config();
console.log(
  '⚙️  Loaded SMTP config:',
  'HOST=' + process.env.SMTP_HOST,
  'PORT=' + process.env.SMTP_PORT,
  'SECURE=' + process.env.SMTP_SECURE,
  'USER=' + (process.env.SMTP_USER ? '✓' : '✗')
);

// 2. ES-module __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 4. Verify SMTP at startup
transporter.verify((err, success) => {
  if (err) {
    console.error('SMTP configuration error:', err);
  } else {
    console.log('SMTP server is ready to send messages');
  }
});

const app = express();

// 5. Middleware
// ← serve all your .html/.css/.js/images from this folder
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 6. Contact form handler
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  console.log('📬 Received contact form:', { name, email, message });

  try {
    // a) Send visitor’s message to site owner
    await transporter.sendMail({
      from: `"CounselMore Site" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `New message from ${name}`,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
      replyTo: email,             // so “Reply” goes straight to the visitor
    });
    console.log('Owner notification sent');

    // b) Send confirmation back to the visitor
    await transporter.sendMail({
      from: `"CounselMore Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Thanks for reaching out to CounselMore!',
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for your message! We’ll be in touch shortly.</p>
        <p>— The CounselMore Team</p>
      `,
    });
    console.log('Visitor confirmation sent');

    return res.json({ success: true });
  } catch (err) {
    console.error('Error sending email:', err);

  }
});

// 7. Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
