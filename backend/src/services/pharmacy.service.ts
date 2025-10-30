import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Pharmacy } from '../interfaces/pharmacy.interface';

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('PHARMACY_API_URL') ||
      'https://67e14fb758cc6bf785254550.mockapi.io/pharmacies';
  }

  async findPharmacyByPhone(phoneNumber: string): Promise<Pharmacy | null> {
    try {
      this.logger.log(`Looking up pharmacy with phone: ${phoneNumber}`);

      const response = await axios.get(this.apiUrl);
      const pharmaciesData = response.data;

      const pharmacy = pharmaciesData.find(
        (p) =>
          p.phone === phoneNumber ||
          p.phone.replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''),
      );

      if (pharmacy) {
        this.logger.log(`Found pharmacy: ${pharmacy.name}`);

        // Transform the API data to match our interface
        const transformedPharmacy: Pharmacy = {
          id: pharmacy.id.toString(),
          name: pharmacy.name,
          phone: pharmacy.phone,
          address:
            pharmacy.city && pharmacy.state
              ? `${pharmacy.city}, ${pharmacy.state}`
              : undefined,
          city: pharmacy.city,
          state: pharmacy.state,
          rxVolume: this.calculateRxVolume(pharmacy.prescriptions || []),
          contactPerson: 'Pharmacy Manager', // Default since not provided by API
          email: pharmacy.email,
          prescriptions: pharmacy.prescriptions,
        };

        return transformedPharmacy;
      }

      this.logger.log(`No pharmacy found for phone: ${phoneNumber}`);
      return null;
    } catch (error) {
      this.logger.error(`Error fetching pharmacy data: ${error.message}`);
      throw new Error('Failed to lookup pharmacy information');
    }
  }

  private calculateRxVolume(
    prescriptions: Array<{ drug: string; count: number }>,
  ): number {
    // Sum up all prescription counts and multiply by estimated monthly factor
    const monthlyTotal = prescriptions.reduce(
      (sum, prescription) => sum + prescription.count,
      0,
    );
    // Multiply by 30 to simulate monthly volume (assuming daily counts)
    return monthlyTotal * 30;
  }

  async getAllPharmacies(): Promise<Pharmacy[]> {
    try {
      const response = await axios.get(this.apiUrl);
      const pharmaciesData = response.data;

      return pharmaciesData.map((pharmacy) => ({
        id: pharmacy.id.toString(),
        name: pharmacy.name,
        phone: pharmacy.phone,
        address:
          pharmacy.city && pharmacy.state
            ? `${pharmacy.city}, ${pharmacy.state}`
            : undefined,
        city: pharmacy.city,
        state: pharmacy.state,
        rxVolume: this.calculateRxVolume(pharmacy.prescriptions || []),
        contactPerson: 'Pharmacy Manager',
        email: pharmacy.email,
        prescriptions: pharmacy.prescriptions,
      }));
    } catch (error) {
      this.logger.error(`Error fetching all pharmacies: ${error.message}`);
      throw new Error('Failed to fetch pharmacy data');
    }
  }

  async createPharmacy(pharmacyData: Partial<Pharmacy>): Promise<Pharmacy> {
    try {
      this.logger.log(`Creating new pharmacy: ${pharmacyData.name}`);

      const response = await axios.post(this.apiUrl, pharmacyData);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating pharmacy: ${error.message}`);
      throw new Error('Failed to create pharmacy');
    }
  }

  formatRxVolumeMessage(rxVolume: number): string {
    if (rxVolume >= 10000) {
      return `With your high prescription volume of ${rxVolume.toLocaleString()} Rx per month, Pharmesol can provide significant cost savings and operational efficiency improvements.`;
    } else if (rxVolume >= 5000) {
      return `Your pharmacy's volume of ${rxVolume.toLocaleString()} Rx per month puts you in an excellent position to benefit from our specialized high-volume services.`;
    } else if (rxVolume >= 1000) {
      return `With ${rxVolume.toLocaleString()} Rx per month, we can help optimize your operations and prepare for future growth.`;
    } else {
      return `We understand the challenges of managing ${rxVolume.toLocaleString()} prescriptions monthly, and we can help streamline your processes.`;
    }
  }
}
