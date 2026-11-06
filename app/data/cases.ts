/* Shared case types. All case data now lives in the backend SQLite database
   (../nyayam_backend) and is served over the Elysia API — see app/lib/cases.ts. */

export type StageGroup = "arguments" | "evidence" | "other";
export type LiveAccent = "red" | "blue" | "green";

export interface LiveStream {
  speaker: string;
  text: string;
  time: string;
  accent: LiveAccent;
}

export interface JudicialCase {
  slug: string;
  verdictRef: string;
  caseNumber: string;
  title: string;
  subtitle: string;
  division: string;
  bench: string;
  filedDate: string;
  petitionerAOR: string;
  respondentAOR: string;
  stage: string;
  stageGroup: StageGroup;
  lastUpdate: string;
  live?: LiveStream;
}

export type AvatarTone = "neutral" | "judge" | "petitioner" | "respondent";
export type RoleTone = "presiding" | "petitioner" | "respondent" | "live";

export interface TranscriptTurn {
  speaker: string;
  avatar: string; // initials, or material icon name when `icon` is set
  avatarTone: AvatarTone;
  icon?: boolean;
  role?: { label: string; tone: RoleTone };
  time: string;
  text: string;
  live?: boolean;
}

export interface CaseDetail {
  verdictRef: string;
  sessionPhase: string;
  sessionPhaseSub: string;
  diarizationActive: boolean;
  diarizationSub: string;
  sessionClock: string;
  presidingJudge: string;
  division: string;
  petitionerName: string;
  petitionerRep: string;
  respondentName: string;
  respondentRep: string;
  filingDate: string;
  sessionDate: string;
  originalLanguages: string;
  judicialFormat: string;
  spokenTurns: string;
  spokenTurnsPct: number;
  speakers: string;
  speakersPct: number;
  petitionerSubmissions: string;
  respondentSubmissions: string;
  statutes: string[];
  transcript: TranscriptTurn[];
}

export interface CaseBundle {
  case: JudicialCase;
  detail: CaseDetail;
  next: { slug: string; verdictRef: string } | null;
}

export const PRESIDING_JUDGE = "Hon'ble Mr. Justice R. K. Shrivastava";
