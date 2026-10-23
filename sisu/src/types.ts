import { SpeechStateExternalEvent } from "speechstate";

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
  consultDB: (q: Question, p: Proposition[], retrievedBirds: bird[], generatedBirdQuestion?: Question) => consultDBResult | null;
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
  totalDescription: Proposition[];
  generatedBirdQuestion?: Question;
}

export interface DMContext extends TotalInformationState {
  ssRef: any;
  lastUserMoves?: Move[];
  lastUserUtterance?: string;
  lastSysMove?: Move
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
  totalDescription: Proposition[];
  generatedBirdQuestion?: Question;
  birdLocation?: string,
  birdEnvironment?: string,
}

export type DMEvent =
  | { type: "CLICK" }
  | SpeechStateExternalEvent
  | NextMovesEvent
  | BirdFiltersEvent
  | BirdIdentifiedEvent;

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
  value: Question;
};

export type BirdFiltersEvent = {
  type: "BIRD_FILTERS_UPDATED";
  value: {
    location?: string;
    environment?: string;
  };
};

export type BirdIdentifiedEvent = {
  type: "BIRD_IDENTIFIED";
  value: bird;
};

export type distributionCat =
  | "northern europe" // Sweden, Norway, Finland, Denmark, Iceland and the Baltic countries
  | "non-northern europe" // All remaining European regions
  | "north africa" // Morocco to Egypt
  | "sub-saharan africa" // Africa south of the Sahara
  | "middle-east and western asia" // Anatolia, Caucasus, Levant, Cyprus, Iraq, Iran and Arabian Peninsula
  | "central and south asia" // Central Asian countries and the Indian subcontinent
  | "east asia" // China, Mongolia, Korea and Japan
  | "southeast asia" // Mainland and island Southeast Asia
  | "north america" // Greenland, Canada, the United States, Mexico, Central America and the Caribbean
  | "south america" // All countries and territories in South America, including the Falkland Islands
  | "australia and oceania" //Australia, New Zealand and Pacific islands

export type habitatCat =
  | "forest" // Forest, woodland, coniferous forest, deciduous forest, mixed forest and forest edges
  | "shrubland" // Scrub, shrubland, thickets and shrubby vegetation
  | "grassland" // Grassland, meadows, pastures and open grassy areas
  | "agricultural land" // Farmland, cultivated fields, arable land and agricultural landscapes
  | "urban and suburban" // Gardens, parks, towns, cities and residential areas
  | "freshwater wetlands" // Marshes, swamps, reed beds, bogs and other freshwater wetland habitats
  | "freshwater bodies" // Lakes, ponds, rivers, streams and reservoirs 
  | "coastal and marine" // Seashores, beaches, estuaries, tidal flats, coastal waters and marine environments
  | "tundra and heathland" // Arctic tundra, heathland, moorland and similar open environments
  | "mountains and rocky habitats" // Mountains, cliffs, rocky slopes and other rocky environments
  | "sparsely vegetated terrain" // Bare sand, dunes, gravel flats and other areas with little vegetation, for inland areas only

export type conservationStatusCat =
  | 'critically endangered'
  | 'endangered'
  | 'vulnerable'
  | 'near threatened'
  | 'conservation dependent'
  | 'least concern'

export type sizeCat =
  | 'XS' // sparrow, tit
  | 'S' // blackbird, starling, dove
  | 'M' // pigeon, crow, mallard, buzzard
  | 'L' // heron, swan, stork

export type bird = {
  id: Number,
  commonName: string,
  scientificName: string,
  distribution: distributionCat[],
  habitat: habitatCat[],
  size: sizeCat,
  conservationStatus: conservationStatusCat,
  description: string,
};
