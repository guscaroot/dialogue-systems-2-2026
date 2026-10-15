import { Move } from "./types";
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
    "What kind of environment are you in? A forest, a garden, a beach, or somewhere else?"
  ],
  [
    { 
      type: "ask",
      content: WHQ("bird_description")
    },
    "Please describe the bird."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "eurasian blue tit"}}, "I think it's a blue tit."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "grey heron"}}, "I think it's a grey heron."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "house sparrow"}}, "I think it's a house sparrow."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "great tit"}}, "I think it's a great tit."],
];

export function nlg(moves: Move[]): string {
  console.log("generating moves", moves);
  function generateMove(move: Move): string {
    if ( move.type === "ask" && move.content.text ) {
      return move.content.text;
    }
    if ( move.type === "answer" && typeof move.content === "object"
      && move.content.predicate === "observed_bird" ) {
        const utterance = `I think I've identified the species: ${move.content.argument}`
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
  utterance: string,
  location: string,
  environment: string): Promise<bird[]> {
  console.log("[NLU] Getting bird query");
  const embedding = await openai.embeddings
    .create({
      model: "qwen3-embedding",
      input: utterance,
      dimensions: 384,
    })
    .then((result) => result.data[0].embedding);
  const points = (await client.query("birdsDBtest2", {
    query: embedding,
    filter: {
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
  },
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


export async function nluLLM(utterance: string) : Promise<Move[]> {
  const instructions: string = `
  Map the user utterance below into a JSON array of Move objects.
  Return ONLY valid JSON.
  Use ONLY lowercase.
  Do not add anything else than the array. No explanation. No introduction. Start with [ and end with ].
  Use ONLY the following types and predicates, do not create new move label.
  For questions, use only given predicates.
  For answers, use only given predicates, and retrieve the string to fill in the argument of the proposition or the shortanswer.
  If the answer corresponds to a bird description, use type 'answer' with predicate 'bird_description' and the user utterance as argument.
  If the answer corresponds to a location, use type 'answer' with predicate 'bird_location' in case of a Proposition, and map the user answer to its corresponding allowed agument.
  If the answer corresponds to an environment, use type 'answer' with predicate 'bird_environment' in case of a Proposition, and map the user answer to its corresponding allowed agument.
  
  Allowed move types are exactly:
  - "greet"
  - "answer"
  - "ask"

  Allowed predicates are exactly:
  - "bird_location"
  - "bird_environment"
  - "bird_description"
  - "observed_bird"

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
  - "forest" // Forest, woodland, coniferous forest, deciduous forest, mixed forest and forest edges
  - "shrubland" // Scrub, shrubland, thickets and shrubby vegetation
  - "grassland" // Grassland, meadows, pastures and open grassy areas
  - "agricultural land" // Farmland, cultivated fields, arable land and agricultural landscapes
  - "urban and suburban" // Gardens, parks, towns, cities and residential areas
  - "freshwater wetlands" // Marshes, swamps, reed beds, bogs and other freshwater wetland
  - "freshwater bodies" // Lakes, ponds, rivers, streams and reservoirs 
  - "coastal and marine" // Seashores, beaches, estuaries, tidal flats, coastal waters and marine environments
  - "tundra and heathland" // Arctic tundra, heathland, moorland and similar open environments
  - "mountains and rocky habitats" // Mountains, cliffs, rocky slopes and other rocky environments
  - "sparsely vegetated terrain" // Bare sand, dunes, gravel flats and other areas with little vegetation, for inland areas only

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

  User: "sweden"
  Output:
  [
    {
      "type": "answer",
      "content": "northern europe"
    }
  ]

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

  User: "france"
  Output:
  [
    {
      "type": "answer",
      "content": "non-northern europe"
    }
  ]
  
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

  User: "on the coast"
  Output:
  [
    {
      "type": "answer",
      "content": "coastal and marine"
    }
  ]
  
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
    

User utterance:
`
  const prompt:string = instructions.concat('/n', utterance)
  console.log("[NLU] Query");
  const response = await openai.chat.completions
  .create({
        messages:[{ role:  "user" , content: prompt }],
        model:'llama3.1:latest',
     })
  .then((result) => result.choices[0].message.content)
  console.log("[NLU] Result:", response);
  const moves: Move[] = JSON.parse(response!)

  return moves
};

export async function getBirdQuestion(birds: bird[], totalDescription:string[]) : Promise<string> {
  const birdDescriptions: string = birds.map(
    (bird) => `${bird.commonName}: ${bird.description}`
  ).join('\n');
  const userDescription = totalDescription.join('\n');
  const prompt:string = `
  You are a bird identification assistant.

  The following bird species are possible matches:
  ${birdDescriptions}

  The following information has already been given by the user:
  ${userDescription}

  Your task is to formulate the SINGLE MOST DISCRIMINATING question that will help distinguish between these candidates.

  Instructions:
  Compare the candidate species' characteristics, based only on the provided descriptions.
  Consider the information already given by the user.
  Identify a visible characteristic that is not already given and best separates the candidates (such as colour, size, markings, or shape).
  Ask about easily observable features such as plumage, head colour, beak shape, body size, or leg length.
  Avoid questions about characteristics shared by all candidates.
  Make the question short, clear, and easy for a non-expert to answer.
  Do not ask about a characteristic that cannot reasonably be inferred from the available descriptions.
  Do not name the bird species.
  Use ONLY open-ended or multiple-choice questions.
  NEVER ask yes/no questions.
  For every question, explicitly ask the user to answer in a complete sentence describing what they observe, even when the question offers multiple-choice options. Never encourage one-word answers.
  Return ONLY the question text, without JSON or explanations.
`;

  console.log("[MORE INFO NEEDED] Getting bird question");
  const response = await openai.chat.completions
  .create({
        messages:[{ role:  "user" , content: prompt }],
        model:'llama3.1:latest',
        temperature: 0.2 // fore more predictable / consistent responses
     })
  .then((result) => result.choices[0].message.content?.trim() ?? "")
  console.log("[MORE INFO NEEDED] additional question to ask:", response);
  return response
};