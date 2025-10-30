import { Injectable, Logger } from '@nestjs/common';
import { Pharmacy } from '../interfaces/pharmacy.interface';

@Injectable()
export class FollowUpService {
  private readonly logger = new Logger(FollowUpService.name);

  async sendEmail(
    pharmacy: Partial<Pharmacy>,
    subject: string,
    content: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`[MOCK] Sending email to ${pharmacy.email}`);
      this.logger.log(`[MOCK] Subject: ${subject}`);
      this.logger.log(`[MOCK] Content: ${content}`);

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.logger.log(
        `[MOCK] Email sent successfully to ${pharmacy.contactPerson} at ${pharmacy.email}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`[MOCK] Failed to send email: ${error.message}`);
      return false;
    }
  }

  async scheduleCallback(
    pharmacy: Partial<Pharmacy>,
    preferredTime: string,
    notes?: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`[MOCK] Scheduling callback for ${pharmacy.name}`);
      this.logger.log(
        `[MOCK] Contact: ${pharmacy.contactPerson} at ${pharmacy.phone}`,
      );
      this.logger.log(`[MOCK] Preferred time: ${preferredTime}`);
      if (notes) {
        this.logger.log(`[MOCK] Notes: ${notes}`);
      }

      // Simulate callback scheduling delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      this.logger.log(
        `[MOCK] Callback scheduled successfully for ${preferredTime}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`[MOCK] Failed to schedule callback: ${error.message}`);
      return false;
    }
  }

  generateFollowUpEmail(pharmacy: Partial<Pharmacy>): {
    subject: string;
    content: string;
  } {
    const subject = `Follow-up: Pharmesol Solutions for ${pharmacy.name}`;

    const content = `
Dear ${pharmacy.contactPerson},

Thank you for taking the time to speak with us today about how Pharmesol can support ${pharmacy.name}.

Based on our conversation, here's what we discussed:
- Your current monthly prescription volume: ${pharmacy.rxVolume?.toLocaleString() || 'To be determined'}
- Location: ${pharmacy.address || 'To be confirmed'}

How Pharmesol can help your pharmacy:
• Streamlined prescription processing for high-volume operations
• Cost reduction strategies specifically designed for pharmacies handling ${pharmacy.rxVolume ? pharmacy.rxVolume.toLocaleString() + '+' : 'high volumes of'} prescriptions monthly
• Operational efficiency improvements
• Dedicated support for growing pharmacy businesses

Next Steps:
1. We'll prepare a customized proposal based on your specific needs
2. Schedule a detailed consultation to discuss implementation
3. Provide references from similar high-volume pharmacies

Please don't hesitate to reach out if you have any immediate questions.

Best regards,
The Pharmesol Sales Team

Phone: 1-800-PHARMESOL
Email: sales@pharmesol.com
Website: www.pharmesol.com
    `.trim();

    return { subject, content };
  }
}
