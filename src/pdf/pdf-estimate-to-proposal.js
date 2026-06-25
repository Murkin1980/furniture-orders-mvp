export function mapPdfEstimateToProposalLines(estimate = {}) {
  if (!estimate || typeof estimate !== "object" || !Array.isArray(estimate.items)) {
    return { items: [], total: 0 };
  }

  const lines = estimate.items.map((item, index) => ({
    line: index + 1,
    label: item.label || `Позиция ${index + 1}`,
    quantity: Math.max(1, Math.round(item.units || 1)),
    unit: "м.п.",
    unitPrice: item.unitPrice || 0,
    total: (item.unitPrice || 0) * Math.max(1, Math.round(item.units || 1))
  }));

  return {
    items: lines,
    total: lines.reduce((sum, l) => sum + l.total, 0)
  };
}
