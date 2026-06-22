import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  private loadTemplate(templateName: string, replacements: Record<string, string>): string {
    const templatePath = path.join(__dirname, 'templates', templateName);
    let html = fs.readFileSync(templatePath, 'utf8');
    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }
    return html;
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
    const fromEmail = this.config.get<string>('RESEND_FROM_EMAIL') as string;

    const html = this.loadTemplate('lead-notification.html', {
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      programOfInterest: lead.programOfInterest,
      message: lead.message,
      createdAt: new Date(lead.createdAt).toLocaleString(),
    });

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `New Lead: ${lead.fullName} — ${lead.programOfInterest}`,
        html,
      });
      this.logger.log(`Lead notification sent to ${adminEmail}`);
    } catch (error) {
      this.logger.error('Failed to send lead notification email', error);
    }
  }

  async sendConfirmationEmail(lead: {
    fullName: string;
    email: string;
    programOfInterest: string;
  }) {
    const fromEmail = this.config.get<string>('RESEND_FROM_EMAIL') as string;

    const html = this.loadTemplate('confirmation.html', {
      fullName: lead.fullName,
      programOfInterest: lead.programOfInterest,
    });

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: lead.email,
        subject: `We've received your message — Delphi Education Hub`,
        html,
      });
      this.logger.log(`Confirmation email sent to ${lead.email}`);
    } catch (error) {
      this.logger.error('Failed to send confirmation email', error);
    }
  }
}
