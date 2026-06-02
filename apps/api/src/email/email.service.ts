import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM || 'EduFlow <noreply@eduflow.app>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP ready: ${user}@${host}:${port}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged, not sent.');
    }
  }

  async send(to: string, subject: string, html: string, text?: string) {
    if (!this.transporter) {
      this.logger.log(`[email-dev] to=${to} subject="${subject}"\n${text ?? html}`);
      return { mocked: true };
    }
    return this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
      text: text ?? stripHtml(html),
    });
  }

  /** Send a verification OTP via email. */
  async sendOtp(to: string, code: string, schoolName?: string) {
    const subject = `Your EduFlow code: ${code}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;background:#f7f8fb;border-radius:14px">
        <h2 style="margin:0 0 16px;color:#1a1f2c">Sign in to ${schoolName ?? 'EduFlow'}</h2>
        <p style="color:#5b6478;line-height:1.5">Use this 6-digit code to sign in. It expires in 5 minutes.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;
                    background:#fff;border:1px solid #e4e7ee;border-radius:12px;padding:16px;margin:20px 0;
                    color:#4f46e5;">${code}</div>
        <p style="color:#8b93a7;font-size:12px">If you didn’t request this, ignore this email.</p>
      </div>`;
    return this.send(to, subject, html);
  }

  /** Notify parents/students that marks are published. */
  async sendMarksPublished(to: string, studentName: string, examName: string, url?: string) {
    const subject = `${examName} results published`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#1a1f2c">${examName} results are out</h2>
        <p style="color:#5b6478">Marks for <strong>${studentName}</strong> have been published.</p>
        ${url ? `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600">View report card</a>` : ''}
      </div>`;
    return this.send(to, subject, html);
  }

  async sendAbsentAlert(to: string, studentName: string, date: string) {
    return this.send(
      to,
      'Absence recorded',
      `<p style="font-family:system-ui">Your child <strong>${studentName}</strong> was marked absent on ${date}.</p>`,
    );
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
