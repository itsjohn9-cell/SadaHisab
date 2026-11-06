import { db } from '../db/db';
import { Currency, FXRate } from '../types';
import { DEFAULT_FX_RATES } from '../db/defaultData';

export async function getAllFXRates(): Promise<FXRate[]> {
  const rates = await db.fx_rates.toArray();
  if (rates.length === 0) {
    return DEFAULT_FX_RATES;
  }
  return rates;
}

export async function getFXRateFor(currency: Currency): Promise<number> {
  if (currency === 'PKR') return 1.0;
  const rateRecord = await db.fx_rates.get(currency);
  if (rateRecord) {
    return rateRecord.effectiveRate;
  }
  const fallback = DEFAULT_FX_RATES.find(r => r.currency === currency);
  return fallback ? fallback.effectiveRate : 1.0;
}

export async function convertToPKR(amount: number, currency: Currency): Promise<{ amountPKR: number; fxRate: number }> {
  if (currency === 'PKR') {
    return { amountPKR: amount, fxRate: 1.0 };
  }
  const rate = await getFXRateFor(currency);
  return {
    amountPKR: Math.round(amount * rate * 100) / 100,
    fxRate: rate
  };
}

export async function convertPKRToAED(amountPKR: number): Promise<number> {
  const aedRate = await getFXRateFor('AED');
  if (aedRate <= 0) return 0;
  return Math.round((amountPKR / aedRate) * 100) / 100;
}

export async function fetchLiveFXRates(): Promise<{ success: boolean; message: string; rates?: FXRate[] }> {
  try {
    // Open Exchange Rates open API (Base USD)
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to reach FX API`);
    }

    const data = await res.json();
    if (!data || !data.rates || !data.rates.PKR) {
      throw new Error('Invalid FX API response structure');
    }

    const pkrPerUSD = data.rates.PKR; // e.g. 278.4

    // For any currency C: 1 C in USD = 1 / data.rates[C]. So 1 C in PKR = pkrPerUSD / data.rates[C].
    const currenciesToUpdate: Array<{ currency: Currency; defaultSpread: number }> = [
      { currency: 'USD', defaultSpread: -1.0 },
      { currency: 'AED', defaultSpread: -1.0 },
      { currency: 'SAR', defaultSpread: -1.0 },
      { currency: 'GBP', defaultSpread: -1.0 },
      { currency: 'MYR', defaultSpread: -1.0 },
      { currency: 'IQD', defaultSpread: 0.0 }
    ];

    const updatedRates: FXRate[] = [];

    for (const item of currenciesToUpdate) {
      const curRateAgainstUSD = data.rates[item.currency];
      if (curRateAgainstUSD) {
        const liveRatePKR = pkrPerUSD / curRateAgainstUSD;
        const roundedLive = Math.round(liveRatePKR * 100) / 100;
        const effective = Math.round((roundedLive + item.defaultSpread) * 100) / 100;

        const record: FXRate = {
          currency: item.currency,
          baseCurrency: 'PKR',
          liveRate: roundedLive,
          spreadAdjustment: item.defaultSpread,
          effectiveRate: effective,
          updatedAt: new Date().toISOString()
        };

        await db.fx_rates.put(record);
        updatedRates.push(record);
      }
    }

    // Keep PKR as 1.0
    await db.fx_rates.put({
      currency: 'PKR',
      baseCurrency: 'PKR',
      liveRate: 1.0,
      spreadAdjustment: 0,
      effectiveRate: 1.0,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Successfully updated ${updatedRates.length} exchange rates with conservative spreads applied.`,
      rates: updatedRates
    };
  } catch (err: any) {
    console.warn('Live FX fetch failed or offline, falling back to cached/default rates:', err);
    return {
      success: false,
      message: `Offline/Error: Using offline fallback rates (USD=276.53, AED=75.31, etc.). Details: ${err.message}`
    };
  }
}

