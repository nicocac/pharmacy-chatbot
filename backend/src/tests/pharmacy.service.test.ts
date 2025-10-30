import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PharmacyService } from '../services/pharmacy.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PharmacyService', () => {
  let service: PharmacyService;

  const mockPharmacies = [
    {
      id: '1',
      name: 'Main Street Pharmacy',
      phone: '+1-555-123-4567',
      address: '123 Main St, Test City, TC 12345',
      rxVolume: 8500,
      contactPerson: 'John Doe',
      email: 'john@mainstreetpharmacy.com',
    },
    {
      id: '2',
      name: 'Downtown Pharmacy',
      phone: '(555) 987-6543',
      address: '456 Downtown Ave, Test City, TC 12345',
      rxVolume: 12000,
      contactPerson: 'Jane Smith',
      email: 'jane@downtownpharmacy.com',
    },
    {
      id: '3',
      name: 'Small Town Pharmacy',
      phone: '555.555.0123',
      address: '789 Small Town Rd, Small Town, ST 54321',
      rxVolume: 800,
      contactPerson: 'Bob Johnson',
      email: 'bob@smalltownpharmacy.com',
    },
  ];

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config = {
        PHARMACY_API_URL: 'https://test-api.mockapi.io/pharmacies',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PharmacyService>(PharmacyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findPharmacyByPhone', () => {
    it('should find pharmacy by exact phone match', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockPharmacies });

      const result = await service.findPharmacyByPhone('+1-555-123-4567');

      expect(result).toEqual(mockPharmacies[0]);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-api.mockapi.io/pharmacies',
      );
    });

    it('should find pharmacy by normalized phone number', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockPharmacies });

      // Test with different formatting
      const result = await service.findPharmacyByPhone('5559876543');

      expect(result).toEqual(mockPharmacies[1]);
    });

    it('should find pharmacy with dot-formatted phone', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockPharmacies });

      const result = await service.findPharmacyByPhone('555-555-0123');

      expect(result).toEqual(mockPharmacies[2]);
    });

    it('should return null for non-existent phone number', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockPharmacies });

      const result = await service.findPharmacyByPhone('+1-555-999-9999');

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(
        service.findPharmacyByPhone('+1-555-123-4567'),
      ).rejects.toThrow('Failed to lookup pharmacy information');
    });

    it('should handle empty response', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      const result = await service.findPharmacyByPhone('+1-555-123-4567');

      expect(result).toBeNull();
    });
  });

  describe('getAllPharmacies', () => {
    it('should return all pharmacies', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockPharmacies });

      const result = await service.getAllPharmacies();

      expect(result).toEqual(mockPharmacies);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-api.mockapi.io/pharmacies',
      );
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API down'));

      await expect(service.getAllPharmacies()).rejects.toThrow(
        'Failed to fetch pharmacy data',
      );
    });
  });

  describe('createPharmacy', () => {
    it('should create a new pharmacy', async () => {
      const newPharmacyData = {
        name: 'New Pharmacy',
        phone: '+1-555-111-2222',
        address: '999 New St, New City, NC 99999',
        rxVolume: 2500,
        contactPerson: 'Alice Brown',
        email: 'alice@newpharmacy.com',
      };

      const createdPharmacy = { id: '4', ...newPharmacyData };
      mockedAxios.post.mockResolvedValue({ data: createdPharmacy });

      const result = await service.createPharmacy(newPharmacyData);

      expect(result).toEqual(createdPharmacy);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-api.mockapi.io/pharmacies',
        newPharmacyData,
      );
    });

    it('should handle creation errors', async () => {
      const newPharmacyData = { name: 'Test Pharmacy' };
      mockedAxios.post.mockRejectedValue(new Error('Creation failed'));

      await expect(service.createPharmacy(newPharmacyData)).rejects.toThrow(
        'Failed to create pharmacy',
      );
    });
  });

  describe('formatRxVolumeMessage', () => {
    it('should format message for very high volume (>=10000)', () => {
      const result = service.formatRxVolumeMessage(15000);

      expect(result).toContain('15,000');
      expect(result).toContain('high prescription volume');
      expect(result).toContain('significant cost savings');
    });

    it('should format message for high volume (>=5000)', () => {
      const result = service.formatRxVolumeMessage(7500);

      expect(result).toContain('7,500');
      expect(result).toContain('excellent position');
      expect(result).toContain('specialized high-volume services');
    });

    it('should format message for medium volume (>=1000)', () => {
      const result = service.formatRxVolumeMessage(3000);

      expect(result).toContain('3,000');
      expect(result).toContain('optimize your operations');
      expect(result).toContain('prepare for future growth');
    });

    it('should format message for lower volume (<1000)', () => {
      const result = service.formatRxVolumeMessage(500);

      expect(result).toContain('500');
      expect(result).toContain('challenges of managing');
      expect(result).toContain('streamline your processes');
    });

    it('should handle edge case of exactly 10000', () => {
      const result = service.formatRxVolumeMessage(10000);

      expect(result).toContain('10,000');
      expect(result).toContain('high prescription volume');
    });

    it('should handle edge case of exactly 5000', () => {
      const result = service.formatRxVolumeMessage(5000);

      expect(result).toContain('5,000');
      expect(result).toContain('excellent position');
    });

    it('should handle edge case of exactly 1000', () => {
      const result = service.formatRxVolumeMessage(1000);

      expect(result).toContain('1,000');
      expect(result).toContain('optimize your operations');
    });

    it('should handle zero volume', () => {
      const result = service.formatRxVolumeMessage(0);

      expect(result).toContain('0');
      expect(result).toContain('streamline your processes');
    });
  });

  describe('Phone Number Normalization Edge Cases', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockPharmacies });
    });

    it('should handle phone numbers with various formatting', async () => {
      // Test various formats that should match +1-555-123-4567
      const phoneFormats = [
        '15551234567',
        '1-555-123-4567',
        '(555) 123-4567',
        '555 123 4567',
        '555.123.4567',
        '+1 555 123 4567',
      ];

      for (const phone of phoneFormats) {
        const result = await service.findPharmacyByPhone(phone);
        expect(result).toEqual(mockPharmacies[0]);
      }
    });

    it('should handle international formatting', async () => {
      const result = await service.findPharmacyByPhone('+15551234567');
      expect(result).toEqual(mockPharmacies[0]);
    });

    it('should handle phone numbers with extensions', async () => {
      // Should still match the base number
      const result = await service.findPharmacyByPhone(
        '+1-555-123-4567 ext 123',
      );
      expect(result).toEqual(mockPharmacies[0]);
    });
  });
});
