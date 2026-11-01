/**
 * The phone home's "Carry on" row: shown with quizzes, held open with placeholders while the
 * trending list loads (so the subjects below do not jump down; CLS 0.30 measured on live),
 * hidden when there is nothing to carry on with.
 */
export function carryOnRow(
  unfinished: number,
  trending: number,
  trendingLoading: boolean,
): 'show' | 'placeholder' | 'hide' {
  if (unfinished > 0 || trending > 0) return 'show';
  return trendingLoading ? 'placeholder' : 'hide';
}
