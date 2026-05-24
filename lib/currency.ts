// 1 EUR = 1.95583 BGN (фиксиран курс, България е в ERM II)
const EUR_TO_BGN = 1.95583;

export function eurToBgn(eur: number): number {
  return Math.round(eur * EUR_TO_BGN * 100) / 100;
}

export function bgnToEur(bgn: number): number {
  return Math.round((bgn / EUR_TO_BGN) * 100) / 100;
}

export function formatBgn(amount: number): string {
  return `${amount.toFixed(2)} лв.`;
}

export function formatEur(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

export function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} лв.`;
}
