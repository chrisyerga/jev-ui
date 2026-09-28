/** Jev list price: $42 per billion input tokens; output tokens are not billed. */
const USD_PER_INPUT_TOKEN = 42 / 1_000_000_000;

export function estimateJevCostUsd(inputTokens: number): number {
  return inputTokens * USD_PER_INPUT_TOKEN;
}

/** Human-readable estimate for the inspector (not a quote). */
export function formatJevCostUsd(usd: number): string {
  if (usd <= 0) return "$0";
  if (usd < 0.000_01) return "<$0.00001";
  if (usd < 0.01) return `~$${usd.toFixed(5)}`;
  if (usd < 1) return `~$${usd.toFixed(4)}`;
  return `~$${usd.toFixed(2)}`;
}
