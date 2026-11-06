import { db } from '../db/db';
import { Currency, FXRate, FXValuationMode } from '../types';
import { DEFAULT_FX_RATES } from '../db/defaultData';

export function getFXValuationMode(): FXValuationMode {
  return (localStorage.getItem('sada_fx_mode') as FXValuationMode) || 'CONSERVATIVE_SPREAD';
}

export function setFXValuationMode(mode: FXValuationMode): void {
  localStorage.setItem('sada_fx_mode', mode);
}

export async function getAllFXRates(): Promise<FXRate[]> {
  const rates = await db.fx_rates.toArray();
  if (rates.length === 0) {
    return DEFAULT_FX_RATES;
  }
  return rates;
}

export async function getFXRateFor(currency: Currency, modeOverride?: FXValuationMode): Promise<number> {
  if (currency === 'PKR') return 1.0;
  const mode = modeOverride || getFXValuationMode();

  const rateRecord = await db.fx_rates.get(currency);
  const rateData = rateRecord || DEFAULT_FX_RATES.find(r => r.currency === currency);

  if (!rateData) return 1.0;

  if (mode === 'LIVE_MID_MARKET') {
    return rateData.liveRate || rateData.effectiveRate;
  }
  if (mode === 'FIXED_SNAPSHOT') {
    return rateData.snapshotRate || rateData.effectiveRate;
  }
  // Default: CONSERVATIVE_SPREAD (Live Rate - 1 PKR Spread)
  return rateData.effectiveRate;
}

export async function convertToPKR(
  amount: number, 
  currency: Currency, 
  modeOverride?: FXValuationMode
): Promise<{ amountPKR: number; fxRate: number }> {
  if (currency === 'PKR') {
    return { amountPKR: amount, fxRate: 1.0 };
  }
  const rate = await getFXRateFor(currency, modeOverride);
  return {
    amountPKR: Math.round(amount * rate * 100) / 100,
    fxRate: rate
  };
}

export async function convertPKRToAED(amountPKR: number, modeOverride?: FXValuationMode): Promise<number> {
  const aedRate = await getFXRateFor('AED', modeOverride);
  if (aedRate <= 0) return 0;
  return Math.round((amountPKR / aedRate) * 100) / 100;
}

export async function updateSnapshotRate(currency: Currency, snapshotRate: number): Promise<void> {
  const record = await db.fx_rates.get(currency);
  if (record) {
    await db.fx_rates.update(currency, { snapshotRate });
  }
}

export async function fetchLiveFXRates(): Promise<{ success: boolean; message: string; rates?: FXRate[] }> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to reach FX API`);
    }

    const data = await res.json();
    if (!data || !data.rates || !data.rates.PKR) {
      throw new Error('Invalid FX API response structure');
    }

    const pkrPerUSD = data.rates.PKR; // e.g. 278.4

    const currenciesToUpdate: Array<{ currency: Currency; defaultSpread: number; defaultSnapshot: number }> = [
      { currency: 'USD', defaultSpread: -1.0, defaultSnapshot: 278.0 },
      { currency: 'AED', defaultSpread: -1.0, defaultSnapshot: 75.5 },
      { currency: 'SAR', defaultSpread: -1.0, defaultSnapshot: 74.0 },
      { currency: 'GBP', defaultSpread: -1.0, defaultSnapshot: 350.0 },
      { currency: 'MYR', defaultSpread: -1.0, defaultSnapshot: 58.0 },
      { currency: 'IQD', defaultSpread: -0.01, defaultSnapshot: 0.20 }
    ];

    const updatedRates: FXRate[] = [];

    for (const item of currenciesToUpdate) {
      const curRateAgainstUSD = data.rates[item.currency];
      if (curRateAgainstUSD) {
        const liveRatePKR = pkrPerUSD / curRateAgainstUSD;
        const roundedLive = Math.round(liveRatePKR * 100) / 100;
        const effective = Math.round((roundedLive + item.defaultSpread) * 100) / 100;

        const existing = await db.fx_rates.get(item.currency);
        const snapshot = existing?.snapshotRate || item.defaultSnapshot;

        const record: FXRate = {
          currency: item.currency,
          baseCurrency: 'PKR',
          liveRate: roundedLive,
          spreadAdjustment: item.defaultSpread,
          effectiveRate: effective,
          snapshotRate: snapshot,
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
      snapshotRate: 1.0,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: `Updated exchange rates across all 3 valuation modes (Conservative -1 PKR, Live Mid-Market & Snapshot).`,
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
