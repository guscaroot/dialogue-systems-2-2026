import { Move, Question, Proposition } from "./types";
import { objectsEqual, WHQ } from "./utils";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { bird, distributionCat, habitatCat, conservationStatusCat, sizeCat }from "./birds-db"

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
  /*[{ type: "answer", content: {predicate: "observed_bird", argument: "eurasian blue tit"}}, "I think it's a blue tit."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "grey heron"}}, "I think it's a grey heron."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "house sparrow"}}, "I think it's a house sparrow."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "great tit"}}, "I think it's a great tit."],*/
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
  
  const points = (await client.query("birdsDBtest3", {
    query: embedding,
    filter: filter,
    with_payload: true,
    limit: 10
  })).points;
  if (points.length === 0) {
    console.log("[NLU] No bird retrieved")
  };
  const retrieved_birds : bird[] = points.map((item) => ({
    id: Number(item.id),
    commonName: item.payload!.commonName as string,
    scientificName: item.payload!.scientificName as string,
    distribution: item.payload!.distribution as distributionCat[],
    habitat: item.payload!.habitat as habitatCat[],
    size: item.payload!.size as sizeCat,
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
  const instructions: string = `
  Map the user utterance below into a JSON array of Move objects.
  Consider the system move below to which the user utterance is replying, to better map the user utterance.
  If the system makes an 'ask' move, the user utterance is certainly an 'answer' move with the same predicate.
  Return ONLY valid JSON.
  Use ONLY lowercase.
  Do not add anything else than the array. No explanation. No introduction. Start with [ and end with ].
  Use ONLY the following types and predicates, do not create new move label.
  For 'ask' moves, use only given predicates.
  For 'answer' moves, use only given predicates, and retrieve the string to fill in the argument of the proposition or the shortanswer.
  If the answer corresponds to a location, use type 'answer' with predicate 'bird_location' in case of a Proposition, and map the user answer to its corresponding allowed agument.
  If the answer corresponds to an environment, use type 'answer' with predicate 'bird_environment' in case of a Proposition, and map the user answer to its corresponding allowed agument.
  The user may over-answer and reply to 'bird_environment' together with 'bird_location'.
  If the answer corresponds to a bird description, use type 'answer' with predicate 'bird_description' and the user utterance as argument.
  If the answer corresponds to a specific bird's feature, use type 'answer' with the appropriate allowed predicate and the user utterance as argument.
  If the answer corresponds to a specific bird's feature, and in case of a short answer, use the predicate and text from the system move to extend the user utterance into a complete sentence, and use this as argument.

  Allowed move types are exactly:
  - "answer"
  - "ask"

  Allowed predicates are exactly:
  ${predicates.map(predicate => `- "${predicate}"`).join("\n")}

  Allowed arguments for predicate "bird_location" are exactly:
  - "northern europe" // to use only for Sweden, Norway, Finland, Denmark, Iceland and the Baltic countries
  - "non-northern europe" // to use only for all remaining European regions
  - "north africa" // to use only for Morocco to Egypt
  - "sub-saharan africa" // to use only for Africa south of the Sahara
  - "middle-east and western asia" // to use only for Anatolia, Caucasus, Levant, Cyprus, Iraq, Iran and Arabian Peninsula
  - "central and south asia" // to use only for Central Asian countries and the Indian subcontinent
  - "east asia" // to use only for China, Mongolia, Korea and Japan
  - "southeast asia" // to use only for Mainland and island Southeast Asia
  - "north america" // to use only for Greenland, Canada, the United States, Mexico, Central America and the Caribbean
  - "south america" // to use only for all countries and territories in South America, including the Falkland Islands
  - "australia and oceania" // to use only for Australia, New Zealand and Pacific islands

  Allowed arguments for predicate "bird_environment" are exactly:
  - "forest" // to use for forest, woods, woodland, forest edges and similar
  - "shrubland" // to use for scrub, shrubland, thickets, shrubby vegetation and similar
  - "grassland" // to use for grassland, meadows, pastures, open grassy areas and similar
  - "agricultural land" // to use for farmland, cultivated fields, arable land, agricultural landscapes and similar
  - "urban and suburban" // to use for gardens, parks, towns, cities, residential areas and similar
  - "freshwater wetlands" // to use for marshes, swamps, reed beds, bogs and other freshwater wetland
  - "freshwater bodies" // to use for lakes, ponds, rivers, streams, reservoirs and other freshwater bodies
  - "coastal and marine" // to use for seashores, beaches, estuaries, tidal flats, coastal waters and marine environments
  - "tundra and heathland" // to use fo arctic tundra, heathland, moorland and similar open environments
  - "mountains and rocky habitats" // to use for mountains, cliffs, rocky slopes and other rocky environments
  - "sparsely vegetated terrain" // to use for bare sand, dunes, gravel flats and other areas with little vegetation, for inland areas only

  For an ask move:
  {
    "type": "ask",
    "content": {
      "type": "whq",
      "predicate": string
    }
  }

  For an answer with a proposition:
  {
    "type": "answer",
    "content": {
      "predicate": predicate,
      "argument": string
    }
  }

  For a short answer:
  {
    "type": "answer",
    "content": string
  }

  Examples:
  
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

  System: { "type": "greet", "content": null }
  User: "i see a bird and want to know which species it is"
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
      "content": "northern europe"
    }
  ]

  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_location"
      }
  }
  User: "i'm in gothenburg"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_location",
        "argument":"northern europe"
      }
    }
  ]

  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_location"
      }
  }
  User: "france"
  Output:
  [
    {
      "type": "answer",
      "content": "non-northern europe"
    }
  ]
  
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

  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_environment"
      }
  }
  User: "on the coast"
  Output:
  [
    {
      "type": "answer",
      "content": "coastal and marine"
    }
  ]
  
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_environment"
      }
  }
  User: "i'm in a forest close to a lake"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_environment",
        "argument":"forest"
      }
    },
    {
      "type": "answer",
      "content": {
        "predicate": "bird_environment",
        "argument":"freshwater bodies"
      }
    },
  ]

  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_location"
      }
  }
  User: "i'm in a forest in gothenburg"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_location",
        "argument":"northern europe"
      }
    },
    {
      "type": "answer",
      "content": {
        "predicate": "bird_environment",
        "argument":"forest"
      }
    },
  ]

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
  
  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_description"
      }
  }
  User: "it's a long bird with long legs and a long beak"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "bird_description",
        "argument": "it's a long bird with long legs and a long beak"
      }
    }
  ]
  
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

  System: {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "bird_crown",
        "text": "what is the colour of the bird's crown?"
      }
  }
  User: "it's blue"
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

System move: ${JSON.stringify(lastSysMove)}
User utterance: `

const instruction: string =
`
Determine whether the user utterance is an appropriate response to the system move.
Then map the user utterance into a JSON array of move objects.

- If the system move is 'greet' and the user expresses an intention to identify a bird, return an 'ask' move with the predicate 'observed_bird'. Otherwise, return [].
- Never generate an 'ask' move with any other predicate.
- If the system move is 'ask', return an 'answer' move using the same predicate as in the system move, but only if the user provides a relevant answer.
- If the user utterance is not a reasonably interpretable answer, return [].
- For answers to bird_location or bird_environment questions, map the user utterance into the single best corresponding allowed argument.
- Allow additional answers only when explicitly supported by the utterance, and only for the predicate 'bird_environment' that can appear as aditionnal information to a system question with predicate 'bird_location'.
- Never generate 2 'ask' moves using the same predicate.
- For short answers to bird-feature questions, use the system move's predicate and question text to expand the user's utterance into a complete, explicit sentence. Preserve the user's meaning without adding information.
- NEVER guess or invent information.
- Use only the allowed move types, predicates, arguments, and JSON structures.
- Use ONLY lowercase.
- Return only a valid JSON array.
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
- "northern europe" // to use only for Sweden, Norway, Finland, Denmark, Iceland and the Baltic countries
- "non-northern europe" // to use only for all remaining European regions
- "north africa" // to use only for Morocco to Egypt
- "sub-saharan africa" // to use only for Africa south of the Sahara
- "middle-east and western asia" // to use only for Anatolia, Caucasus, Levant, Cyprus, Iraq, Iran and Arabian Peninsula
- "central and south asia" // to use only for Central Asian countries and the Indian subcontinent
- "east asia" // to use only for China, Mongolia, Korea and Japan
- "southeast asia" // to use only for Mainland and island Southeast Asia
- "north america" // to use only for Greenland, Canada, the United States, Mexico, Central America and the Caribbean
- "south america" // to use only for all countries and territories in South America, including the Falkland Islands
- "australia and oceania" // to use only for Australia, New Zealand and Pacific islands

Allowed arguments for predicate "bird_environment" are exactly:
- "forest" // to use only for forest, woods, woodland, forest edges and similar
- "shrubland" // to use only for scrub, shrubland, thickets, shrubby vegetation and similar
- "grassland" // to use only for grassland, meadows, pastures, open grassy areas and similar
- "agricultural land" // to use only for farmland, cultivated fields, arable land, agricultural landscapes and similar
- "urban and suburban" // to use only for gardens, parks, towns, cities, residential areas and similar
- "freshwater wetlands" // to use only for marshes, swamps, reed beds, bogs and other freshwater wetland
- "freshwater bodies" // to use only for lakes, ponds, rivers, streams, reservoirs and other freshwater bodies
- "coastal and marine" // to use only for seashores, beaches, estuaries, tidal flats, coastal waters and marine environments
- "tundra and heathland" // to use only for arctic tundra, heathland, moorland and similar open environments
- "mountains and rocky habitats" // to use only for mountains, cliffs, rocky slopes and other rocky environments
- "sparsely vegetated terrain" // to use only for bare sand, dunes, gravel flats and other areas with little vegetation, for inland areas only

Allowed JSON structures for move objects are exactly:
- For an ask move:
{
  "type": "ask",
  "content": {
    "type": "whq",
    "predicate": "observed_bird"
  }
}

- For an answer:
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
    "content": "content": {
      "predicate": "bird_location",
      "argument":"northern europe"
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
    "content": "content": {
      "predicate": "bird_location",
      "argument":"non-northern europe"
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
      "argument":"coastal and marine"
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
      "argument":"northern europe"
    }
  },
  {
    "type": "answer",
    "content": {
      "predicate": "bird_environment",
      "argument":"urban and suburban"
    }
  },
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
      "predicate": "bird_crown",
      "text": "what is the colour of the bird's crown?"
    }
}
User: "it's blue"
Output:
[
  {
    "type": "answer",
    "content": {
      "predicate": "bird_crown",
      "argument": "the bird has a blue crown"
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
User: "the bird has a blue crown"
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

  const prompt:string = instruction.concat(utterance)
  console.log("[NLU] Query");
  const response = await openai.chat.completions
  .create({
        messages:[{ role:  "user" , content: prompt }],
        model:'llama3.1:latest',
        temperature: 0.5
     })
  .then((result) => result.choices[0].message.content)
  console.log("[NLU] Result:", response);
  const moves: Move[] = JSON.parse(response!)

  return moves
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
  Never use an already used predicate.
  Never ask about a characteristic whose predicate already appears in the information provided by the user.
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
        temperature: 0.2 // for more predictable / consistent responses
     })
  .then((result) => result.choices[0].message.content)
  console.log("[MORE INFO NEEDED] additional question to ask:", response);
  const question: Question = JSON.parse(response!)
  return question
};