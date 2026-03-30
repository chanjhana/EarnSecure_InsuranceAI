// Currency helpers for rider/admin summaries.

export function paiseToInr(paise: number): string {
  return `INR ${(paise / 100).toFixed(2)}`;
}
