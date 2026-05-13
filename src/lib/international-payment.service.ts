import { supabase } from './supabase';

export type PaymentMethod = 'card' | 'bank_transfer' | 'mobile_money' | 'wallet' | 'crypto' | 'buy_now_pay_later';

export interface PaymentProvider {
  id: string;
  name: string;
  type: PaymentMethod;
  supportedCurrencies: string[];
  supportedRegions: string[];
  isActive: boolean;
  commissionPercentage: number;
  documentation?: string;
}

export interface InternationalPaymentConfig {
  currency: string;
  region: string;
  availableMethods: PaymentProvider[];
  defaultMethod: string;
}

const PAYMENT_PROVIDERS: Record<string, PaymentProvider> = {
  // Card Payments
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    type: 'card',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'HKD', 'INR', 'AED'],
    supportedRegions: ['US', 'EU', 'GB', 'JP', 'AU', 'CA', 'SG', 'HK', 'IN', 'AE'],
    isActive: true,
    commissionPercentage: 2.9,
    documentation: 'https://stripe.com/docs',
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    type: 'card',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'INR'],
    supportedRegions: ['US', 'EU', 'GB', 'JP', 'AU', 'CA', 'IN'],
    isActive: true,
    commissionPercentage: 3.49,
    documentation: 'https://paypal.com/docs',
  },

  // Mobile Money (Africa & Asia)
  mtn_momo: {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    type: 'mobile_money',
    supportedCurrencies: ['GHS', 'NGN', 'ZAR', 'XOF', 'UGX'],
    supportedRegions: ['GH', 'NG', 'ZA', 'SN', 'UG'],
    isActive: true,
    commissionPercentage: 1.5,
    documentation: 'https://mtn.com/mobile-money',
  },
  airtel_money: {
    id: 'airtel_money',
    name: 'Airtel Money',
    type: 'mobile_money',
    supportedCurrencies: ['KES', 'UGX', 'ZMW', 'RWF'],
    supportedRegions: ['KE', 'UG', 'ZM', 'RW'],
    isActive: true,
    commissionPercentage: 1.5,
    documentation: 'https://airtelmoneyafrica.com',
  },
  mpesa: {
    id: 'mpesa',
    name: 'M-Pesa',
    type: 'mobile_money',
    supportedCurrencies: ['KES'],
    supportedRegions: ['KE'],
    isActive: true,
    commissionPercentage: 1.2,
    documentation: 'https://www.safaricom.co.ke/mpesa',
  },
  flutterwave: {
    id: 'flutterwave',
    name: 'Flutterwave',
    type: 'mobile_money',
    supportedCurrencies: ['GHS', 'NGN', 'ZAR', 'KES', 'UGX'],
    supportedRegions: ['GH', 'NG', 'ZA', 'KE', 'UG'],
    isActive: true,
    commissionPercentage: 2.0,
    documentation: 'https://flutterwave.com/docs',
  },

  // Bank Transfers
  wise: {
    id: 'wise',
    name: 'Wise (TransferWise)',
    type: 'bank_transfer',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'INR', 'SGD', 'ZAR'],
    supportedRegions: ['US', 'EU', 'GB', 'JP', 'AU', 'IN', 'SG', 'ZA'],
    isActive: true,
    commissionPercentage: 1.0,
    documentation: 'https://wise.com/docs',
  },
  payoneer: {
    id: 'payoneer',
    name: 'Payoneer',
    type: 'bank_transfer',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
    supportedRegions: ['US', 'EU', 'GB', 'IN'],
    isActive: true,
    commissionPercentage: 2.0,
    documentation: 'https://payoneer.com/docs',
  },

  // Digital Wallets
  apple_pay: {
    id: 'apple_pay',
    name: 'Apple Pay',
    type: 'wallet',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'],
    supportedRegions: ['US', 'EU', 'GB', 'JP', 'AU', 'CA', 'SG'],
    isActive: true,
    commissionPercentage: 2.9,
    documentation: 'https://applepay.com/docs',
  },
  google_pay: {
    id: 'google_pay',
    name: 'Google Pay',
    type: 'wallet',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD'],
    supportedRegions: ['US', 'EU', 'GB', 'JP', 'IN', 'AU'],
    isActive: true,
    commissionPercentage: 2.9,
    documentation: 'https://googlepay.com/docs',
  },

  // Crypto
  stripe_crypto: {
    id: 'stripe_crypto',
    name: 'Crypto (via Stripe)',
    type: 'crypto',
    supportedCurrencies: ['USD', 'EUR'],
    supportedRegions: ['GLOBAL'],
    isActive: true,
    commissionPercentage: 3.5,
    documentation: 'https://stripe.com/crypto',
  },

  // Buy Now Pay Later
  klarna: {
    id: 'klarna',
    name: 'Klarna',
    type: 'buy_now_pay_later',
    supportedCurrencies: ['EUR', 'GBP', 'SEK', 'DKK', 'USD'],
    supportedRegions: ['EU', 'GB', 'SE', 'DK', 'US'],
    isActive: true,
    commissionPercentage: 5.5,
    documentation: 'https://klarna.com/docs',
  },
};

interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentProvider: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  externalTransactionId?: string;
  createdAt: string;
  completedAt?: string;
}

class InternationalPaymentService {
  /**
   * Get available payment methods for a currency/region
   */
  getPaymentMethods(
    currency: string,
    region: string
  ): PaymentProvider[] {
    const currencyUpper = currency.toUpperCase();
    const regionUpper = region.toUpperCase();

    return Object.values(PAYMENT_PROVIDERS).filter(
      (provider) =>
        provider.isActive &&
        (provider.supportedCurrencies.includes(currencyUpper) ||
          provider.supportedCurrencies.includes('*')) &&
        (provider.supportedRegions.includes(regionUpper) ||
          provider.supportedRegions.includes('GLOBAL'))
    );
  }

  /**
   * Get payment configuration for user's location
   */
  getPaymentConfig(
    currency: string,
    region: string
  ): InternationalPaymentConfig {
    const availableMethods = this.getPaymentMethods(currency, region);

    // Default method based on region
    let defaultMethod = 'stripe'; // Global default
    if (region.toUpperCase() === 'GH') defaultMethod = 'flutterwave';
    if (region.toUpperCase() === 'KE') defaultMethod = 'mpesa';
    if (region.toUpperCase() === 'NG') defaultMethod = 'flutterwave';
    if (region.toUpperCase() === 'ZA') defaultMethod = 'flutterwave';

    return {
      currency,
      region,
      availableMethods,
      defaultMethod,
    };
  }

  /**
   * Get provider details
   */
  getProvider(providerId: string): PaymentProvider | null {
    return PAYMENT_PROVIDERS[providerId] || null;
  }

  /**
   * Calculate fees for a payment
   */
  calculateFees(
    amount: number,
    paymentProviderId: string
  ): { subtotal: number; fee: number; total: number } {
    const provider = this.getProvider(paymentProviderId);
    if (!provider) {
      return { subtotal: amount, fee: 0, total: amount };
    }

    const fee = amount * (provider.commissionPercentage / 100);
    return {
      subtotal: amount,
      fee: Math.round(fee * 100) / 100,
      total: Math.round((amount + fee) * 100) / 100,
    };
  }

  /**
   * Record payment transaction in Supabase
   */
  async createTransaction(
    userId: string,
    amount: number,
    currency: string,
    paymentProvider: string,
    paymentMethod: PaymentMethod,
    externalTransactionId?: string
  ): Promise<PaymentTransaction> {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        amount,
        currency,
        payment_provider: paymentProvider,
        payment_method: paymentMethod,
        external_transaction_id: externalTransactionId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'completed' | 'failed' | 'refunded'
  ): Promise<void> {
    const updateData =
      status === 'completed' ? { status, completed_at: new Date().toISOString() } : { status };

    const { error } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transactionId);

    if (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  }

  /**
   * Get user's payment methods (saved cards/wallets)
   */
  async getUserPaymentMethods(userId: string) {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch payment methods:', error);
      return [];
    }

    return data;
  }

  /**
   * Save payment method for future use
   */
  async savePaymentMethod(
    userId: string,
    paymentProvider: string,
    methodDetails: {
      lastFour?: string;
      expiryMonth?: number;
      expiryYear?: number;
      brand?: string;
    }
  ) {
    const { data, error } = await supabase
      .from('user_payment_methods')
      .insert({
        user_id: userId,
        payment_provider: paymentProvider,
        method_details: methodDetails,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save payment method:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get all payment transactions for a user
   */
  async getUserTransactions(userId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }

    return data;
  }
}

export const internationalPaymentService = new InternationalPaymentService();
