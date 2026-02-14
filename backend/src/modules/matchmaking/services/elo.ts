/**
 * Calculates the expected score for player A against player B using the Elo rating system.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateElo(
  rating: number,
  opponentRating: number,
  result: 0 | 0.5 | 1,
  kFactor = 32,
): number {
  const expected = expectedScore(rating, opponentRating);
  return Math.round(rating + kFactor * (result - expected));
}
