import { Prisma } from '@prisma/client';

type ScoreDimensions = {
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  confidence: number;
};

type ScoringOutput = {
  scores: ScoreDimensions;
  overall: number;
  decision: 'PASS' | 'BORDERLINE' | 'FAIL';
  feedback: string;
  confidence: number;
  relevance: number;
  flagged: boolean;
  flaggedReason?: string;
};

export function simpleScoreFromTranscript(transcript: string): ScoringOutput {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const lengthFactor = Math.min(1, words.length / 40);
  const pacePenalty = words.length < 10 ? 0.85 : 1;
  const base = 50 + Math.round(lengthFactor * 40 * pacePenalty);

  const relevance = Math.max(0, Math.min(100, 50 + words.length * 2));
  const confidenceScore = Math.min(100, 60 + Math.round(lengthFactor * 35));
  const scores: ScoreDimensions = {
    pronunciation: Math.min(10, 5 + Math.round(lengthFactor * 5)),
    fluency: Math.min(10, 5 + Math.round(lengthFactor * 5)),
    grammar: 6,
    vocabulary: 6,
    confidence: Math.min(10, 5 + Math.round(lengthFactor * 4))
  };
  const overall = Math.min(100, base);
  const decision = overall >= 70 ? 'PASS' : overall >= 55 ? 'BORDERLINE' : 'FAIL';
  const flagged = words.length === 0 || overall < 40;
  const feedback = decision === 'PASS'
    ? 'Strong spoken response with good clarity.'
    : decision === 'BORDERLINE'
      ? 'Decent response. Improve pacing and clarity to increase confidence.'
      : 'Response was limited. Provide more detail and steady pacing.';
  const flaggedReason = flagged ? (words.length === 0 ? 'No speech detected' : 'Low overall score') : undefined;
  return { scores, overall, decision, feedback, confidence: confidenceScore, relevance, flagged, flaggedReason };
}

export type ScoresJson = Prisma.JsonObject & { pronunciation: number; fluency: number; grammar: number; vocabulary: number; confidence: number; feedback?: string };
