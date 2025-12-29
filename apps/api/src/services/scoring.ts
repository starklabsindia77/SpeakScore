import { Prisma } from '@prisma/client';

type ScoreDimensions = {
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  confidence: number;
};

export function simpleScoreFromTranscript(transcript: string): { scores: ScoreDimensions; overall: number; decision: 'PASS' | 'BORDERLINE' | 'FAIL'; feedback: string } {
  const lengthFactor = Math.min(1, transcript.split(' ').length / 30);
  const base = 50 + Math.round(lengthFactor * 40);
  const scores: ScoreDimensions = {
    pronunciation: Math.min(10, 5 + Math.round(lengthFactor * 5)),
    fluency: Math.min(10, 5 + Math.round(lengthFactor * 5)),
    grammar: 6,
    vocabulary: 6,
    confidence: Math.min(10, 5 + Math.round(lengthFactor * 4))
  };
  const overall = Math.min(100, base);
  const decision = overall >= 70 ? 'PASS' : overall >= 55 ? 'BORDERLINE' : 'FAIL';
  const feedback = decision === 'PASS'
    ? 'Strong spoken response with good clarity.'
    : decision === 'BORDERLINE'
      ? 'Decent response. Improve pacing and clarity to increase confidence.'
      : 'Response was limited. Provide more detail and steady pacing.';
  return { scores, overall, decision, feedback };
}

export type ScoresJson = Prisma.JsonObject & { pronunciation: number; fluency: number; grammar: number; vocabulary: number; confidence: number; feedback?: string };
