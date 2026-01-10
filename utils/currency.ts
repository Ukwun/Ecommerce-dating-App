import AsyncStorage from '@react-native-async-storage/async-storage';

const RATES_KEY = '@currency_rates';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

type RatesCache = {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
};

async function fetchRates(base = 'NGN', symbols: string[] = ['USD', 'EUR', 'NGN']) {
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${symbols.join(',')}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch exchange rates');
  const data = await resp.json();
  return data.rates as Record<string, number>;
}

export async function getCachedRates(base = 'NGN', symbols: string[] = ['USD', 'EUR', 'NGN']) {
  try {
    const raw = await AsyncStorage.getItem(RATES_KEY);
    if (raw) {
      const parsed: RatesCache = JSON.parse(raw);
      if (parsed.base === base && Date.now() - parsed.timestamp < TTL_MS) {
        return parsed.rates;
      }
    }
  } catch (e) {
    // ignore
  }

  // fetch fresh
  try {
    const rates = await fetchRates(base, symbols);
    const cache: RatesCache = { base, rates, timestamp: Date.now() };
    AsyncStorage.setItem(RATES_KEY, JSON.stringify(cache)).catch(() => {});
    return rates;
  } catch (e) {
    // try to return stale if present
    try {
      const raw = await AsyncStorage.getItem(RATES_KEY);
      if (raw) {
        const parsed: RatesCache = JSON.parse(raw);
        return parsed.rates;
      }
    } catch (err) {
      // ignore
    }
    throw e;
  }
}

export async function convert(amount: number, from = 'NGN', to = 'NGN') {
  if (from === to) return amount;
  try {
    // Get rates with base=from so rates[to] gives multiplier
    const rates = await getCachedRates(from, [to]);
    const rate = rates?.[to];
    if (!rate) return amount;
    return amount * rate;
  } catch (e) {
    // Fallback: naive conversion if from is NGN -> divide similar to previous heuristic
    if (from === 'NGN' && to === 'USD') return amount / 1200;
    if (from === 'NGN' && to === 'EUR') return amount / 1300;
    if (from === 'USD' && to === 'NGN') return amount * 1200;
    if (from === 'EUR' && to === 'NGN') return amount * 1300;
    return amount;
  }
}
