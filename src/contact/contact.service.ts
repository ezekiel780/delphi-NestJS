import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(dto: CreateContactDto) {
    const lead = await this.prisma.lead.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        programOfInterest: dto.programOfInterest,
        message: dto.message,
      },
    });

    await this.mailService.sendLeadNotification(lead);

    return {
      message: 'Your message has been received. We will get back to you shortly.',
    };
  }
}
