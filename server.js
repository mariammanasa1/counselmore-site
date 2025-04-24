// server.js
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Load .env and dump config
dotenv.config();
console.log('⚙️  Loaded SMTP config:',
  'HOST=' + process.env.SMTP_HOST,
  'PORT=' + process.env.SMTP_PORT,
  'SECURE=' + process.env.SMTP_SECURE,
  'USER=' + (process.env.SMTP_USER ? '✓' : '✗')
);

// 2. ES-module __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. Create transporter once
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 6. Contact endpoint
app.post('/contact', async (req, res) => {
  const { name, email, message } = req.body;
  console.log('📬 Received contact form:', { name, email, message });

  // Send to site owner
  try {
    const ownerInfo = await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to: process.env.CONTACT_EMAIL,
      subject: `New message from ${name}`,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    });
    console.log('Owner notification sent:', ownerInfo.messageId);
  } catch (err) {
    console.error('Error sending owner notification:', err);
    // We continue—even if owner email fails, try visitor email
  }

  // Send confirmation to visitor
  try {
    const visitorInfo = await transporter.sendMail({
      from: `"CounselMore Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Thanks for reaching out to CounselMore!',
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for your message! We’ll be in touch shortly.</p>
        <p>— The CounselMore Team</p>
      `,
    });
    console.log('Visitor confirmation sent:', visitorInfo.messageId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Error sending visitor confirmation:', err);
    return res.status(500).json({ success: false, error: err.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
