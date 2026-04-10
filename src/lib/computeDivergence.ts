export function computeGapScore(confidences: number[]): number {
  if (confidences.length === 0) return 0;
  if (confidences.length === 1) return 0; // No gap if only one person

  const max = Math.max(...confidences);
  const min = Math.min(...confidences);
  
  return max - min;
}
