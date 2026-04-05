export function formatBdtEur(bdt: number, eur?: number, decimals = 2) {
  const bd = bdt.toFixed(decimals);
  return typeof eur === "number"
    ? `BDT ${bd} · €${eur.toFixed(decimals)}`
    : `BDT ${bd}`;
}

export function formatEurWithRate(eur: number, rate?: number, decimals = 2) {
  if (rate && rate > 0) {
    const bdt = Math.round((eur / rate + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return `BDT ${bdt.toFixed(decimals)} · €${eur.toFixed(decimals)}`;
  }
  return `€${eur.toFixed(decimals)}`;
}
