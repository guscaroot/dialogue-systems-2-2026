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
  identifiedBird?: bird
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
  | BirdQuestionGeneratedEvent
  | FinalSpeechCompleteEvent;

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

export type FinalSpeechCompleteEvent = {
  type: "FINAL_SPEECH_COMPLETE";
};

export type distributionCat =
  | "jordan"
  | "greece"
  | "georgia"
  | "uruguay"
  | "puerto rico (to usa)"
  | "togo"
  | "kuwait"
  | "nauru"
  | "bonaire, sint eustatius and saba (to netherlands)"
  | "kyrgyzstan"
  | "tonga"
  | "hungary"
  | "italy"
  | "lesotho"
  | "saudi arabia"
  | "cape verde"
  | "mauritius"
  | "latvia"
  | "nicaragua"
  | "mexico"
  | "new zealand"
  | "libya"
  | "marshall islands"
  | "sudan"
  | "moldova"
  | "vanuatu"
  | "eritrea"
  | "st lucia"
  | "cameroon"
  | "san marino"
  | "iceland"
  | "russia (central asian)"
  | "kazakhstan"
  | "grenada"
  | "cook islands"
  | "argentina"
  | "curaçao (to netherlands)"
  | "russia (asian)"
  | "åland islands (to finland)"
  | "dominican republic"
  | "usa"
  | "timor-leste"
  | "austria"
  | "trinidad and tobago"
  | "kiribati"
  | "montserrat (to uk)"
  | "netherlands"
  | "palau"
  | "india"
  | "france"
  | "greenland (to denmark)"
  | "bangladesh"
  | "singapore"
  | "united states minor outlying islands (to usa)"
  | "armenia"
  | "mongolia"
  | "north macedonia"
  | "belarus"
  | "réunion (to france)"
  | "malta"
  | "congo, democratic republic of"
  | "bosnia and herzegovina"
  | "colombia"
  | "pakistan"
  | "south sudan"
  | "svalbard and jan mayen islands (to norway)"
  | "lithuania"
  | "south africa"
  | "spain"
  | "ghana"
  | "french guiana"
  | "suriname"
  | "bulgaria"
  | "serbia"
  | "belize"
  | "australia"
  | "mali"
  | "monaco"
  | "azerbaijan"
  | "british indian ocean territory"
  | "morocco"
  | "barbados"
  | "comoros"
  | "russia (european)"
  | "brunei"
  | "kenya"
  | "sri lanka"
  | "algeria"
  | "cocos (keeling) islands (to australia)"
  | "guinea-bissau"
  | "china (mainland)"
  | "anguilla (to uk)"
  | "indonesia"
  | "virgin islands (to uk)"
  | "thailand"
  | "croatia"
  | "oman"
  | "philippines"
  | "falkland islands (malvinas)"
  | "fiji"
  | "côte d'ivoire"
  | "mayotte (to france)"
  | "tanzania"
  | "afghanistan"
  | "cyprus"
  | "united arab emirates"
  | "paraguay"
  | "bhutan"
  | "chile"
  | "venezuela"
  | "mozambique"
  | "french southern territories"
  | "estonia"
  | "bahamas"
  | "sierra leone"
  | "solomon islands"
  | "christmas island (to australia)"
  | "yemen"
  | "aruba (to netherlands)"
  | "gabon"
  | "dominica"
  | "brazil"
  | "germany"
  | "faroe islands (to denmark)"
  | "czechia"
  | "israel"
  | "malawi"
  | "turks and caicos islands (to uk)"
  | "united kingdom"
  | "russia"
  | "st helena (to uk)"
  | "jamaica"
  | "finland"
  | "tunisia"
  | "vatican city"
  | "bahrain"
  | "egypt"
  | "north korea"
  | "japan"
  | "south korea"
  | "angola"
  | "guinea"
  | "belgium"
  | "costa rica"
  | "chad"
  | "lebanon"
  | "norway"
  | "guatemala"
  | "antigua and barbuda"
  | "rwanda"
  | "romania"
  | "st barthelemy (to france)"
  | "montenegro"
  | "canada"
  | "türkiye"
  | "slovenia"
  | "guyana"
  | "somalia"
  | "madagascar"
  | "slovakia"
  | "western sahara"
  | "bermuda (to uk)"
  | "portugal"
  | "maldives"
  | "eswatini"
  | "uzbekistan"
  | "new caledonia (to france)"
  | "botswana"
  | "ethiopia"
  | "taiwan, china"
  | "ukraine"
  | "djibouti"
  | "seychelles"
  | "st kitts and nevis"
  | "gambia"
  | "sint maarten (to netherlands)"
  | "albania"
  | "liberia"
  | "peru"
  | "virgin islands (to usa)"
  | "nepal"
  | "st vincent and the grenadines"
  | "iran, islamic republic of"
  | "st martin (to france)"
  | "andorra"
  | "cayman islands (to uk)"
  | "ireland"
  | "senegal"
  | "st pierre and miquelon (to france)"
  | "gibraltar (to uk)"
  | "cuba"
  | "panama"
  | "honduras"
  | "uganda"
  | "cambodia"
  | "sweden"
  | "myanmar"
  | "laos"
  | "tajikistan"
  | "hong kong (china)"
  | "liechtenstein"
  | "poland"
  | "burundi"
  | "turkmenistan"
  | "niger"
  | "são tomé e príncipe"
  | "macao (china)"
  | "palestine"
  | "luxembourg"
  | "papua new guinea"
  | "syria"
  | "zimbabwe"
  | "iraq"
  | "bolivia"
  | "martinique (to france)"
  | "guadeloupe (to france)"
  | "vietnam"
  | "mauritania"
  | "ecuador"
  | "burkina faso"
  | "equatorial guinea"
  | "el salvador"
  | "congo"
  | "malaysia"
  | "zambia"
  | "benin"
  | "south georgia & the south sandwich islands"
  | "namibia"
  | "switzerland"
  | "northern mariana islands (to usa)"
  | "central african republic"
  | "micronesia, federated states of"
  | "haiti"
  | "guam (to usa)"
  | "nigeria"
  | "qatar"
  | "denmark"
;

export const distributionCats: Set<distributionCat> = new Set([
  "jordan", 
  "greece",
  "georgia",
  "uruguay",
  "puerto rico (to usa)",
  "togo",
  "kuwait",
  "nauru",
  "bonaire, sint eustatius and saba (to netherlands)",
  "kyrgyzstan",
  "tonga",
  "hungary",
  "italy",
  "lesotho",
  "saudi arabia",
  "cape verde",
  "mauritius",
  "latvia",
  "nicaragua",
  "mexico",
  "new zealand",
  "libya",
  "marshall islands",
  "sudan",
  "moldova",
  "vanuatu",
  "eritrea",
  "st lucia",
  "cameroon",
  "san marino",
  "iceland",
  "russia (central asian)",
  "kazakhstan",
  "grenada",
  "cook islands",
  "argentina",
  "curaçao (to netherlands)",
  "russia (asian)",
  "åland islands (to finland)",
  "dominican republic",
  "usa",
  "timor-leste",
  "austria",
  "trinidad and tobago",
  "kiribati",
  "montserrat (to uk)",
  "netherlands",
  "palau",
  "india",
  "france",
  "greenland (to denmark)",
  "bangladesh",
  "singapore",
  "united states minor outlying islands (to usa)",
  "armenia",
  "mongolia",
  "north macedonia",
  "belarus",
  "réunion (to france)",
  "malta",
  "congo, democratic republic of",
  "bosnia and herzegovina",
  "colombia",
  "pakistan",
  "south sudan",
  "svalbard and jan mayen islands (to norway)",
  "lithuania",
  "south africa",
  "spain",
  "ghana",
  "french guiana",
  "suriname",
  "bulgaria",
  "serbia",
  "belize",
  "australia",
  "mali",
  "monaco",
  "azerbaijan",
  "british indian ocean territory",
  "morocco",
  "barbados",
  "comoros",
  "russia (european)",
  "brunei",
  "kenya",
  "sri lanka",
  "algeria",
  "cocos (keeling) islands (to australia)",
  "guinea-bissau",
  "china (mainland)",
  "anguilla (to uk)",
  "indonesia",
  "virgin islands (to uk)",
  "thailand",
  "croatia",
  "oman",
  "philippines",
  "falkland islands (malvinas)",
  "fiji",
  "côte d'ivoire",
  "mayotte (to france)",
  "tanzania",
  "afghanistan",
  "cyprus",
  "united arab emirates",
  "paraguay",
  "bhutan",
  "chile",
  "venezuela",
  "mozambique",
  "french southern territories",
  "estonia",
  "bahamas",
  "sierra leone",
  "solomon islands",
  "christmas island (to australia)",
  "yemen",
  "aruba (to netherlands)",
  "gabon",
  "dominica",
  "brazil",
  "germany",
  "faroe islands (to denmark)",
  "czechia",
  "israel",
  "malawi",
  "turks and caicos islands (to uk)",
  "united kingdom",
  "russia",
  "st helena (to uk)",
  "jamaica",
  "finland",
  "tunisia",
  "vatican city",
  "bahrain",
  "egypt",
  "north korea",
  "japan",
  "south korea",
  "angola",
  "guinea",
  "belgium",
  "costa rica",
  "chad",
  "lebanon",
  "norway",
  "guatemala",
  "antigua and barbuda",
  "rwanda",
  "romania",
  "st barthelemy (to france)",
  "montenegro",
  "canada",
  "türkiye",
  "slovenia",
  "guyana",
  "somalia",
  "madagascar",
  "slovakia",
  "western sahara",
  "bermuda (to uk)",
  "portugal",
  "maldives",
  "eswatini",
  "uzbekistan",
  "new caledonia (to france)",
  "botswana",
  "ethiopia",
  "taiwan, china",
  "ukraine",
  "djibouti",
  "seychelles",
  "st kitts and nevis",
  "gambia",
  "sint maarten (to netherlands)",
  "albania",
  "liberia",
  "peru",
  "virgin islands (to usa)",
  "nepal",
  "st vincent and the grenadines",
  "iran, islamic republic of",
  "st martin (to france)",
  "andorra",
  "cayman islands (to uk)",
  "ireland",
  "senegal",
  "st pierre and miquelon (to france)",
  "gibraltar (to uk)",
  "cuba",
  "panama",
  "honduras",
  "uganda",
  "cambodia",
  "sweden",
  "myanmar",
  "laos",
  "tajikistan",
  "hong kong (china)",
  "liechtenstein",
  "poland",
  "burundi",
  "turkmenistan",
  "niger",
  "são tomé e príncipe",
  "macao (china)",
  "palestine",
  "luxembourg",
  "papua new guinea",
  "syria",
  "zimbabwe",
  "iraq",
  "bolivia",
  "martinique (to france)",
  "guadeloupe (to france)",
  "vietnam",
  "mauritania",
  "ecuador",
  "burkina faso",
  "equatorial guinea",
  "el salvador",
  "congo",
  "malaysia",
  "zambia",
  "benin",
  "south georgia & the south sandwich islands",
  "namibia",
  "switzerland",
  "northern mariana islands (to usa)",
  "central african republic",
  "micronesia, federated states of",
  "haiti",
  "guam (to usa)",
  "nigeria",
  "qatar",
  "denmark",
]);

export type habitatCat =
  | "forest" // to use for forest, woods, woodland, forest edges and similar
  | "savanna" // to use for dry and moist savannas
  | "shrubland" // to use for scrub, shrubland, thickets, shrubby vegetation, shrub-dominated heathland and similar
  | "grassland" // to use for grassland, meadows, tundra grassland, open grassy areas and similar
  | "inland aquatic" // to use for inland rivers, streams, creeks, lakes, ponds, reservoirs, marshes, swamps, bogs, fens, reed beds, freshwater springs, inland saline waters, canals, artificial inland aquatic environments and similar
  | "rocky areas" // to use for inland cliffs, mountain peaks, rocky slopes, exposed rock, scree, rocky outcrops and other rocky environments
  | "caves and subterranean" // to use for caves, underground cavities, and other non-aquatic subterranean environment
  | "desert" // to use for hot, temperate, and cold deserts, including inland deserts with predominantly bare sand or gravel
  | "marine and coastal" // to use for seashores, beaches, estuaries, tidal flats, coastal waters, coral reefs, seagrass beds, ocean, deep-sea, coastal dunes and cliffs and other marine environments
  | "agricultural land" // to use for farmland, cultivated fields, arable land, cropland, agricultural pastures, orchards, vineyards, agricultural landscapes and similar
  | "urban and suburban" // to use for gardens, parks, towns, cities, residential areas, suburbs, villages and similar
;

export const habitatCats: Set<habitatCat> = new Set([
  "forest",
  "savanna",
  "shrubland", 
  "grassland",
  "inland aquatic", 
  "rocky areas", 
  "caves and subterranean", 
  "desert", 
  "marine and coastal",
  "agricultural land",
  "urban and suburban", 
])

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
  id: number,
  commonName: string,
  scientificName: string,
  distribution: distributionCat[],
  habitat: habitatCat[],
  //size: sizeCat,
  conservationStatus: conservationStatusCat,
  description: string,
  wikiImageURL: string
};
