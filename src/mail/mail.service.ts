import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    sgMail.setApiKey(this.config.get<string>('SENDGRID_API_KEY') as string);
  }

  async sendLeadNotification(lead: {
    fullName: string;
    email: string;
    phone: string;
    programOfInterest: string;
    message: string;
    createdAt: Date;
  }) {
    const adminEmail = this.config.get<string>('ADMIN_NOTIFICATION_EMAIL') as string;
    const fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL') as string;

    const msg: sgMail.MailDataRequired = {
      to: adminEmail,
      from: fromEmail,
      subject: `New Lead: ${lead.fullName} — ${lead.programOfInterest}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a7a4a; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: white; margin: 0;">New Lead — Delphi Education Hub</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #333; width: 40%;">Full Name</td>
                <td style="padding: 10px; color: #555;">${lead.fullName}</td>
              </tr>
              <tr style="background-color: #e8f5ee;">
                <td style="padding: 10px; font-weight: bold; color: #333;">Email</td>
                <td style="padding: 10px; color: #555;">${lead.email}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #333;">Phone</td>
                <td style="padding: 10px; color: #555;">${lead.phone}</td>
              </tr>
              <tr style="background-color: #e8f5ee;">
                <td style="padding: 10px; font-weight: bold; color: #333;">Program of Interest</td>
                <td style="padding: 10px; color: #555;">${lead.programOfInterest}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #333;">Message</td>
                <td style="padding: 10px; color: #555;">${lead.message}</td>
              </tr>
              <tr style="background-color: #e8f5ee;">
                <td style="padding: 10px; font-weight: bold; color: #333;">Submitted At</td>
                <td style="padding: 10px; color: #555;">${new Date(lead.createdAt).toLocaleString()}</td>
              </tr>
            </table>
            <div style="margin-top: 24px; padding: 16px; background-color: #1a7a4a; border-radius: 6px; text-align: center;">
              <p style="color: white; margin: 0; font-size: 14px;">Log in to your admin dashboard to manage this lead.</p>
            </div>
          </div>
        </div>
      `,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Lead notification sent to ${adminEmail}`);
    } catch (error) {
      this.logger.error('Failed to send lead notification email', error);
    }
  }
}
