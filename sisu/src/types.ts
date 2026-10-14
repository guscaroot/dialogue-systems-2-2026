import { SpeechStateExternalEvent } from "speechstate";
import { bird } from "./birds-db"

type Individuals = Predicates;
type Predicates = { [index: string]: string };
export type Domain = {
  plans: PlanInfo[];
  predicates: Predicates; // Mapping from predicate to sort
  individuals: Individuals; // Mapping from individual to sort
  openSorts: string[];
};

export type PlanInfo = {
  type: "action" | "issue";
  content: null | Proposition | ShortAnswer | Question;
  plan: Action[];
};

type consultDBResult =
  | { type: "identified"; proposition: Proposition }
  | { type: "moreInfo_needed"; actions: Action[] }
  | { type: "no_match" }

export type Database = {
  consultDB: (q: Question, p: Proposition[], retrievedBirds: bird[], generatedBirdQuestion?: string) => consultDBResult | null;
};

export type ShortAnswer = string;
export type Proposition = {
  predicate: string;
  argument: string;
};

export type Question = WhQuestion;
type WhQuestion = { type: "whq"; predicate: string ; text?: string };

interface OtherMove {
  type: "greet" | "request" | "noUnderstandingFeedback" | "noInputFeedback" | "noInput";
  content: null | string;
}
interface AnswerMove {
  type: "answer";
  content: Proposition | ShortAnswer;
}
interface AskMove {
  type: "ask";
  content: Question;
}

export type Move = OtherMove | AnswerMove | AskMove;

export type Action = {
  type:
    | "greet"
    | "respond" // not to be used in plans
    | "raise"
    | "findout"
    | "consultDB";
  content: null | Question;
};

type Speaker = "usr" | "sys";

export interface InformationState {
  next_moves: Move[];
  domain: Domain;
  database: Database;
  private: { agenda: Action[]; plan: Action[]; bel: Proposition[] };
  shared: {
    lu?: { speaker: Speaker; moves: Move[] };
    qud: Question[];
    com: Proposition[];
  };
  retrievedBirds?: bird[];
  totalDescription: string[];
  generatedBirdQuestion?: string;
}

export interface DMContext extends TotalInformationState {
  ssRef: any;
  lastUserMoves?: Move[];
  lastUserUtterance?: string;
}

export interface DMEContext extends TotalInformationState {
  parentRef: any;
}

export interface TotalInformationState {
  /** interface variables */
  latest_speaker?: Speaker;
  latest_moves?: Move[];

  /** information state */
  is: InformationState;
  retrievedBirds?: bird[];
  totalDescription: string[];
  generatedBirdQuestion?: string;
}

export type DMEvent =
  | { type: "CLICK" }
  | SpeechStateExternalEvent
  | NextMovesEvent;

export type DMEEvent = 
  | SaysMovesEvent
  | BirdsRetrievedEvent
  | BirdQuestionGeneratedEvent;

export type SaysMovesEvent = {
  type: "SAYS";
  value: { speaker: Speaker; moves: Move[] };
};

export type NextMovesEvent = {
  type: "NEXT_MOVES";
  value: Move[];
};

export type BirdsRetrievedEvent = {
  type: "BIRDS_RETRIEVED";
  value: {
    birds: bird[];
    speaker: Speaker;
    moves: Move[]
  };
};

export type BirdQuestionGeneratedEvent = {
  type: "BIRD_QUESTION_GENERATED";
  value: string;
};