import { Move, Question, Proposition, bird,
  distributionCat, habitatCat, conservationStatusCat, sizeCat, distributionCats, habitatCats } from "./types";
import { objectsEqual, WHQ } from "./utils";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

const client = new QdrantClient({ host: "localhost", port: 6333 });

const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1/",
  apiKey: "ollama",
  dangerouslyAllowBrowser: true,
});


interface NLUMapping {
  [index: string]: Move[];
}
type NLGMapping = [Move, string][];

const nluMapping: NLUMapping = { // use only lower case here
  "what is this bird?": [
    {
      type: "ask",
      content: WHQ("observed_bird"),
    },
  ],
  "*noinput*": [
    {
      type: "noInput",
      content: null,
    },
  ],
  "sweden": [
    {
      type: "answer",
      content: "sweden",
    },
  ],
  "i see a small bird with a blue crown": [
    {
      type: "answer",
      content: "blue crown",
    },
  ],
};
const nlgMapping: NLGMapping = [
  [{ type: "greet", content: null }, "Hello and welcome to BirdyTalk! How can I help you?"],
  [
    {
      type: "noUnderstandingFeedback",
      content: null,
    },
    "Sorry, I didn't understand.",
  ],
  [
    {
      type: "noInputFeedback",
      content: null,
    },
    "Sorry, I didn't hear you.",
  ],
  [
    {
      type: "ask",
      content: WHQ("bird_location") 
    },
    "Where are you birdwatching today?"
  ],
  [
    {
      type: "ask",
      content: WHQ("bird_environment")
    },
    "What kind of environment is the bird in? A forest, a garden, a beach, or somewhere else?"
  ],
  [
    { 
      type: "ask",
      content: WHQ("bird_description")
    },
    "Please describe the bird."],
];

export function nlg(moves: Move[]): string {
  console.log("generating moves", moves);
  function generateMove(move: Move): string {
    if ( move.type === "ask" && move.content.text ) {
      return move.content.text;
    }
    if ( move.type === "answer" && typeof move.content === "object"
      && move.content.predicate === "observed_bird" ) {
        if (move.content.argument !== "unknown") {
        const utterance = `I think I've identified the species: ${move.content.argument}`
        return utterance
        }
        const utterance = "I can't find this bird."
        return utterance
      }
    const mapping = nlgMapping.find((x) => objectsEqual(x[0], move));
    if (mapping) {
      return mapping[1];
    }
    throw new Error(`Failed to generate move ${JSON.stringify(move)}`);
  }
  const utterance = moves.map(generateMove).join(" ");
  console.log("generated utterance:", utterance);
  return utterance;
}

export function nlu(utterance: string): Move[] {
  return nluMapping[utterance.toLowerCase()] || [];
}

export async function getBird(
  totalDescription: Proposition[],
  location: string,
  environment: string,
  retrievedBirds?: bird[],
  ): Promise<bird[]> {
  console.log("[NLU] Getting bird query");
  
  const utterance = totalDescription.map(i => i.argument).join('. ')
  if (!utterance) {
    console.warn("[NLU] No bird description available for retrieval");
    return [];
  }
  let filter;
  if (retrievedBirds) {
    const retrieved_ids = retrievedBirds.map(bird => bird.id)
    filter = {
      must: [
        {
          has_id: retrieved_ids
        },
        {
          key: "distribution",
          match: {
            value: location,
          },
        },
        {
          key: "habitat",
          match: {
            value: environment, // TO DO use any: environment[] in case 2 answers given??
          },
        },
      ],
    }
  } else {
    filter = {
      must: [
        {
          key: "distribution",
          match: {
            value: location,
          },
        },
        {
          key: "habitat",
          match: {
            value: environment, // TO DO use any: environment[] in case 2 answers given??
          },
        },
      ],
    }
  }
  const queryInstruction = `
    Retrieve bird species matching the observed characteristics in the query.
    Prioritize distinctive visual features and distinguish similar species.
    Do not focus on generic characteristics shared by most birds.
    Penalize contradictions between observed features and documented species characteristics.
    `; 
  const text = `Instruct: ${queryInstruction}\nQuery: ${utterance}`
  const embedding = await openai.embeddings
    .create({
      model: "qwen3-embedding",
      input: text,
      dimensions: 384,
    })
    .then((result) => result.data[0].embedding);
  
  const points = (await client.query("birdsDBfromJson", {
    query: embedding,
    filter: filter,
    with_payload: true,
    limit: 1
  })).points;
  if (points.length === 0) {
    console.log("[NLU] No bird retrieved")
  };
  const retrieved_birds : bird[] = points.map((item) => ({
    id: item.id as number,
    commonName: item.payload!.commonName as string,
    scientificName: item.payload!.scientificName as string,
    distribution: item.payload!.distribution as distributionCat[],
    habitat: item.payload!.habitat as habitatCat[],
    //size: 'M',
    conservationStatus: item.payload!.conservationStatus as conservationStatusCat,
    description: item.payload!.description as string,
  }));
  const birds_scores = points.map((item) => ({
    bird: item.payload!.commonName,
    score: item.score
  }))
  console.log("[NLU] Getting Bird result:")
  console.table(birds_scores)
  return retrieved_birds
}


export async function nluLLM(utterance: string, predicates: string[], lastSysMove: Move) : Promise<Move[]> {
  const instruction: string =
  `
  You are an NLU assistant.
  Determine whether the user utterance is an appropriate response to the system move.
  Then map the user utterance into a JSON array of move objects.

  - If the system move is 'greet' and the user expresses an intention to identify a bird, return an 'ask' move with the predicate 'observed_bird'. Otherwise, return [].
  - Never generate an 'ask' move with any other predicate.
  - If the system move is 'ask', return an 'answer' move using the same predicate as in the system move, but only if the user provides a relevant answer. Otherwise, return [].
  - If the user utterance is not a reasonably interpretable answer, return [].
  - For answers to bird_location and bird_environment questions, map the user utterance into the single best corresponding allowed argument.
  - Allow additional answers only when explicitly supported by the utterance, and only for the predicate 'bird_environment' that can appear as aditionnal information to a system question with predicate 'bird_location'.
  - Never generate 2 'answer' moves using the same predicate.
  - For short answers to bird-feature questions, use the system move's predicate and question text to expand the user's utterance into a complete, explicit sentence. Preserve the user's meaning without adding information.
  - NEVER guess or invent information.
  - Use ONLY the allowed move types, predicates, arguments, and JSON structures.
  - Use ONLY lowercase.
  - Return ONLY a valid JSON ARRAY.
  - Do not add anything else than the array. No explanation. No introduction. Start with [ and end with ].

  Allowed move types are exactly:
    - "answer"
    - "ask"

  Allowed predicate for ask moves is only:
  - "observed_bird"

  Allowed predicates for answer moves are exactly:
  ${predicates
    .filter(predicate => predicate !== "observed_bird")
    .map(predicate => `- "${predicate}"`)
    .join("\n")}

  Allowed arguments for predicate "bird_location" are exactly:
    - "jordan"
    - "greece"
    - "georgia"
    - "uruguay"
    - "puerto rico (to usa)"
    - "togo"
    - "kuwait"
    - "nauru"
    - "bonaire, sint eustatius and saba (to netherlands)"
    - "kyrgyzstan"
    - "tonga"
    - "hungary"
    - "italy"
    - "lesotho"
    - "saudi arabia"
    - "cape verde"
    - "mauritius"
    - "latvia"
    - "nicaragua"
    - "mexico"
    - "new zealand"
    - "libya"
    - "marshall islands"
    - "sudan"
    - "moldova"
    - "vanuatu"
    - "eritrea"
    - "st lucia"
    - "cameroon"
    - "san marino"
    - "iceland"
    - "russia (central asian)"
    - "kazakhstan"
    - "grenada"
    - "cook islands"
    - "argentina"
    - "curaçao (to netherlands)"
    - "russia (asian)"
    - "åland islands (to finland)"
    - "dominican republic"
    - "usa"
    - "timor-leste"
    - "austria"
    - "trinidad and tobago"
    - "kiribati"
    - "montserrat (to uk)"
    - "netherlands"
    - "palau"
    - "india"
    - "france"
    - "greenland (to denmark)"
    - "bangladesh"
    - "singapore"
    - "united states minor outlying islands (to usa)"
    - "armenia"
    - "mongolia"
    - "north macedonia"
    - "belarus"
    - "réunion (to france)"
    - "malta"
    - "congo, democratic republic of"
    - "bosnia and herzegovina"
    - "colombia"
    - "pakistan"
    - "south sudan"
    - "svalbard and jan mayen islands (to norway)"
    - "lithuania"
    - "south africa"
    - "spain"
    - "ghana"
    - "french guiana"
    - "suriname"
    - "bulgaria"
    - "serbia"
    - "belize"
    - "australia"
    - "mali"
    - "monaco"
    - "azerbaijan"
    - "british indian ocean territory"
    - "morocco"
    - "barbados"
    - "comoros"
    - "russia (european)"
    - "brunei"
    - "kenya"
    - "sri lanka"
    - "algeria"
    - "cocos (keeling) islands (to australia)"
    - "guinea-bissau"
    - "china (mainland)"
    - "anguilla (to uk)"
    - "indonesia"
    - "virgin islands (to uk)"
    - "thailand"
    - "croatia"
    - "oman"
    - "philippines"
    - "falkland islands (malvinas)"
    - "fiji"
    - "côte d'ivoire"
    - "mayotte (to france)"
    - "tanzania"
    - "afghanistan"
    - "cyprus"
    - "united arab emirates"
    - "paraguay"
    - "bhutan"
    - "chile"
    - "venezuela"
    - "mozambique"
    - "french southern territories"
    - "estonia"
    - "bahamas"
    - "sierra leone"
    - "solomon islands"
    - "christmas island (to australia)"
    - "yemen"
    - "aruba (to netherlands)"
    - "gabon"
    - "dominica"
    - "brazil"
    - "germany"
    - "faroe islands (to denmark)"
    - "czechia"
    - "israel"
    - "malawi"
    - "turks and caicos islands (to uk)"
    - "united kingdom"
    - "russia"
    - "st helena (to uk)"
    - "jamaica"
    - "finland"
    - "tunisia"
    - "vatican city"
    - "bahrain"
    - "egypt"
    - "north korea"
    - "japan"
    - "south korea"
    - "angola"
    - "guinea"
    - "belgium"
    - "costa rica"
    - "chad"
    - "lebanon"
    - "norway"
    - "guatemala"
    - "antigua and barbuda"
    - "rwanda"
    - "romania"
    - "st barthelemy (to france)"
    - "montenegro"
    - "canada"
    - "türkiye"
    - "slovenia"
    - "guyana"
    - "somalia"
    - "madagascar"
    - "slovakia"
    - "western sahara"
    - "bermuda (to uk)"
    - "portugal"
    - "maldives"
    - "eswatini"
    - "uzbekistan"
    - "new caledonia (to france)"
    - "botswana"
    - "ethiopia"
    - "taiwan, china"
    - "ukraine"
    - "djibouti"
    - "seychelles"
    - "st kitts and nevis"
    - "gambia"
    - "sint maarten (to netherlands)"
    - "albania"
    - "liberia"
    - "peru"
    - "virgin islands (to usa)"
    - "nepal"
    - "st vincent and the grenadines"
    - "iran, islamic republic of"
    - "st martin (to france)"
    - "andorra"
    - "cayman islands (to uk)"
    - "ireland"
    - "senegal"
    - "st pierre and miquelon (to france)"
    - "gibraltar (to uk)"
    - "cuba"
    - "panama"
    - "honduras"
    - "uganda"
    - "cambodia"
    - "sweden"
    - "myanmar"
    - "laos"
    - "tajikistan"
    - "hong kong (china)"
    - "liechtenstein"
    - "poland"
    - "burundi"
    - "turkmenistan"
    - "niger"
    - "são tomé e príncipe"
    - "macao (china)"
    - "palestine"
    - "luxembourg"
    - "papua new guinea"
    - "syria"
    - "zimbabwe"
    - "iraq"
    - "bolivia"
    - "martinique (to france)"
    - "guadeloupe (to france)"
    - "vietnam"
    - "mauritania"
    - "ecuador"
    - "burkina faso"
    - "equatorial guinea"
    - "el salvador"
    - "congo"
    - "malaysia"
    - "zambia"
    - "benin"
    - "south georgia & the south sandwich islands"
    - "namibia"
    - "switzerland"
    - "northern mariana islands (to usa)"
    - "central african republic"
    - "micronesia, federated states of"
    - "haiti"
    - "guam (to usa)"
    - "nigeria"
    - "qatar"
    - "denmark"

  Allowed arguments for predicate "bird_environment" are exactly:
    - "forest" // to use for forest, woods, woodland, forest edges and similar
    - "savanna" // to use for dry and moist savannas
    - "shrubland" // to use for scrub, shrubland, thickets, shrubby vegetation, shrub-dominated heathland and similar
    - "grassland" // to use for grassland, meadows, tundra grassland, open grassy areas and similar
    - "inland aquatic" // to use for inland rivers, streams, creeks, lakes, ponds, reservoirs, marshes, swamps, bogs, fens, reed beds, freshwater springs, inland saline waters, canals, artificial inland aquatic habitats and similar
    - "rocky areas" // to use for inland cliffs, mountain peaks, rocky slopes, exposed rock, scree, rocky outcrops and other rocky environments
    - "caves and subterranean" // to use for caves, underground cavities, and other non-aquatic subterranean environment
    - "desert" // to use for hot, temperate, and cold deserts, including inland deserts with predominantly bare sand or gravel
    - "marine and coastal" // to use for seashores, beaches, estuaries, tidal flats, coastal waters, coral reefs, seagrass beds, ocean, deep-sea, coastal dunes and cliffs and other marine environments
    - "agricultural land" // to use for farmland, cultivated fields, arable land, cropland, agricultural pastures, orchards, vineyards, agricultural landscapes and similar
    - "urban and suburban" // to use for gardens, parks, towns, cities, residential areas, suburbs, villages and similar

  Allowed JSON structures for move objects are exactly:
    - For an ask move:
    {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "observed_bird"
      }
    }

    - For an answer move:
    {
      "type": "answer",
      "content": {
        "predicate": predicate,
        "argument": string
      }
    }

  Examples:

  Example A - a valid ask move
  System: { "type": "greet", "content": null }
  User: "what is this bird?"
  Output:
  [
    {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "observed_bird"
      }
    }
  ]

  Example B - a valid ask move
  System: { "type": "greet", "content": null }
  User: "help me identify a bird"
  Output:
  [
    {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "observed_bird"
      }
    }
  ]

  Example C - an unrelated question
  System: { "type": "greet", "content": null }
  User: "what is the weather today?"
  Output:
  []

  Example D - a valid answer move
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_location"
      }
  }
  User: "sweden"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_location",
        "argument":"sweden"
      }
    }
  ]

  Example E - a valid answer move
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_location"
      }
  }
  User: "i'm in france"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_location",
        "argument":"france"
      }
    }
  ]

  Example F - a valid answer move
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_environment"
      }
  }
  User: "i'm in the woods"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_environment",
        "argument":"forest"
      }
    }
  ]

  Example G - a valid answer move
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_environment"
      }
  }
  User: "by the sea"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_environment",
        "argument":"marine and coastal"
      }
    }
  ]

  Example H - a valid answer move with valid additional information
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_location"
      }
  }
  User: "i'm in a park in gothenburg"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_location",
        "argument":"sweden"
      }
    },
    {
      "type": "answer",
      "content": {
        "predicate": "bird_environment",
        "argument":"urban and suburban"
      }
    }
  ]

  Example I - a valid answer move with utterance as argument
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_description"
      }
  }
  User: "i see a small bird with a blue crown"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_description",
        "argument": "i see a small bird with a blue crown"
      }
    }
  ]

  Example J - a valid answer move with utterance as argument
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_crown",
        "text": "what is the colour of the bird's crown?"
      }
  }
  User: "the crown is blue"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_crown",
        "argument": "the crown is blue"
      }
    }
  ]

  Example K - a valid answer move with completed utterance as argument
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_beak",
        "text": "what is the shape of the beak?"
      }
  }
  User: "it's pointed"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_beak",
        "argument": "the bird has a pointed beak"
      }
    }
  ]

  Example L - an unrelated statement
  System:
  {
    "type": "ask",
    "content": {
      "type": "whq",
      "predicate": "bird_environment"
    }
  }
  User: "the bird has long legs"
  Output: []

  Example M - uncertainty without an answer
  System:
  {
    "type": "ask",
    "content": {
      "type": "whq",
      "predicate": "bird_environment"
    }
  }
  User: "i have no idea"
  Output: []

  Example N - an invalid ask move
  System: { "type": "greet", "content": null }
  User: "where are you?"
  Output: []

  System move: ${JSON.stringify(lastSysMove)}
  User utterance: `

  const prompt: string = instruction.concat(utterance)
  console.log("[NLU] Query");
  const response = await openai.chat.completions
  .create({
    messages:[{ role:  "user" , content: prompt }],
    model:'llama3.1:latest',
    temperature: 0.2,
    //response_format: { type: "json_object" },
  })
  .then((result) => result.choices[0].message.content)
  if (!response) {
    console.log("[NLU] Empty model response");
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch (error) {
    console.log("[NLU] Invalid JSON:", response);
    return [];
  }
   //TO DO: per-move validation before filtering??
  if (!validateMoves(parsed, predicates)) {
    console.log("[NLU] Invalid move structure:", parsed);
    return [];
  }
  const inferredMoves = parsed
  // A greeting requires an ask move
  if (lastSysMove.type === "greet"
    && !inferredMoves.some(move => move.type === "ask")) {
    console.log("[NLU] Invalid reply to system greet move", parsed)
    return []
  }
  // Ask moves are only allowed in response to a greeting
  if (inferredMoves.some(move => move.type === "ask")
    && lastSysMove.type !== "greet") {
    console.log("[NLU] Invalid ask move", parsed)
    return []
  }
  // An ask move requires an unique relevant answer + Keep some valid additional information
  if (lastSysMove.type === "ask") {
    const expectedPredicate = lastSysMove.content.predicate;
    const answers = inferredMoves.filter(move => move.type === "answer");
    // Keep only answers matching the system's predicate or the allowed additional bird_environment answer
    const validAnswers = answers.filter(move => {
      if (typeof move.content !== "object" || move.content === null) {
        return false
      }
      const predicate = move.content.predicate
      return (
        predicate === expectedPredicate
        || (expectedPredicate === "bird_location" && predicate === "bird_environment")
      )
    })
    // Count occurrences of each predicate
    const predicateCounts = new Map<string, number>();
    for (const move of validAnswers) {
      if (typeof move.content === "object" && move.content !== null) {
        const predicate = move.content.predicate;
        predicateCounts.set(predicate, (predicateCounts.get(predicate) ?? 0) + 1);
      }
    }
    // Discard all answers whose predicate occurs more than once
    const uniqueAnswers = validAnswers.filter(move => {
      if (typeof move.content !== "object" || move.content === null) {
        return false;
      }
      return predicateCounts.get(move.content.predicate) === 1;
    });
    // Require exactly one valid answer for the system's predicate
    if (uniqueAnswers.filter(move =>
      typeof move.content === "object"
      && move.content !== null
      && move.content.predicate === expectedPredicate
      ).length !== 1
    ) { console.log("[NLU] Missing or duplicate required answer", parsed);
      return [];
    }
    console.log("[NLU] Result:", uniqueAnswers);
    return uniqueAnswers;
  }
  if (inferredMoves)
  console.log("[NLU] Result:", inferredMoves);
  return inferredMoves
};

export async function getBirdQuestion(birds: bird[], totalDescription: Proposition[]) : Promise<Question> {
  const birdDescriptions: string = birds
  .map(
    (bird) => `- ${bird.commonName}: ${bird.description}`)
  .join('\n');
  const descriptionsList: string = totalDescription
  .map(item => `- ${item.predicate}: ${item.argument}`)
  .join("\n")
  const prompt:string = `
  You are a bird identification assistant.

  The following bird species are possible matches:
  ${birdDescriptions}

  The following information has already been given by the user. Each bullet point represents a predicate-argument pair, where the predicate identifies the type of information and the argument is the corresponding value:
  ${descriptionsList}

  Your task is to formulate the SINGLE MOST DISCRIMINATING question that will help distinguish between these candidates.

  Instructions:
  Compare the candidate species' characteristics, based only on the provided descriptions.
  Consider the information already given by the user.
  Identify a visible characteristic that is not already given and best separates the candidates (such as colour, size, markings, or shape).
  NEVER use an already used predicate.
  Treat predicates as identifiers of characteristics. For example, if "bird_colour" has already been provided, do not ask about colour again, even if the question uses different wording.
  Ask about easily observable features such as plumage, head colour, beak shape, body size, or leg length.
  Avoid questions about characteristics shared by all candidates.
  Make the question short, clear, and easy for a non-expert to answer.
  Do not ask about a characteristic that cannot reasonably be inferred from the available descriptions.
  Do not name the bird species.
  Use ONLY open-ended or multiple-choice questions.
  NEVER ask yes/no questions.
  Return ONLY the question as a JSON object:
  {
    "type": "whq",
    "predicate": predicate,
    "text": string
  }
  where "type" has only "whq" as allowed value
  where predicate is inferred and represents the question content, for instance "bird_colour", "bird_crown", "bird_beak", "bird_legs", "bird_shape"...
  and where string is the question itself
`;

  console.log("[MORE INFO NEEDED] Getting bird question");
  const response = await openai.chat.completions
  .create({
        messages:[{ role:  "user" , content: prompt }],
        model:'llama3.1:latest',
        response_format: { type: "json_object" },
        temperature: 0.2 // for more predictable / consistent responses
     })
  .then((result) => result.choices[0].message.content)
  console.log("[MORE INFO NEEDED] additional question to ask:", response);
  const question: Question = JSON.parse(response!)
  return question
};

const fallBackMove1: Move = {
    "type": "ask",
    "content": {
      "type": "whq",
      "predicate": "bird_detail1",
      "text": "Could you give some more detail?"
    }
  };

function isRecord(value: unknown): value is Record<string, unknown> {
return (
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value)
);
};

function validateMoves(value: unknown, predicates: string[]): value is Move[] {
  // The top-level value must be an array.
  if (!Array.isArray(value)) {
    return false;
  }

  const allowedAnswerPredicates = new Set(
    predicates.filter(predicate => predicate !== "observed_bird")
  );

  return value.every((move: unknown) => {
    if (!isRecord(move)) {
      return false;
    }

    // Validate ask moves.
    if (move.type === "ask") {
      return (
        isRecord(move.content) &&
        move.content.type === "whq" &&
        move.content.predicate === "observed_bird" &&
        Object.keys(move).length === 2 &&
        Object.keys(move.content).length === 2
      );
    }

    // Validate answer moves.
    if (move.type === "answer") {
      if (
        !isRecord(move.content) ||
        Object.keys(move).length !== 2 ||
        Object.keys(move.content).length !== 2
      ) {
        return false;
      }

      const { predicate, argument } = move.content;

      if (
        typeof predicate !== "string" ||
        typeof argument !== "string" ||
        !allowedAnswerPredicates.has(predicate)
      ) {
        return false;
      }

      // Validate categorical arguments.
      if (
        predicate === "bird_location" &&
        !distributionCats.has(argument as distributionCat)
      ) {
        return false;
      }

      if (
        predicate === "bird_environment" &&
        !habitatCats.has(argument as habitatCat)
      ) {
        return false;
      }

      return true;
    }

    // Reject all other move types.
    return false;
  });
}
