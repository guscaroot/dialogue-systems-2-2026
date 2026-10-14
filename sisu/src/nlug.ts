import { Move } from "./types";
import { objectsEqual, WHQ } from "./utils";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";
import { bird }from "./birds-database"

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
  "what's your favorite food?": [
    {
      type: "ask",
      content: WHQ("favorite_food"), // ?x.favorite_food(x)
    },
  ],
  pizza: [
    {
      type: "answer",
      content: "pizza",
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
  [{ type: "greet", content: null }, "Hello! You can ask me anything!"],
  [
    {
      type: "answer",
      content: { predicate: "favorite_food", argument: "pizza" },
    },
    "Pizza.",
  ],
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
  [{ type: "ask", content: WHQ("user_location") }, "Where are you?"],
  [{ type: "ask", content: WHQ("bird_description") }, "What do you see?"],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "eurasian blue tit"}}, "I think it's a blue tit."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "grey heron"}}, "I think it's a grey heron."],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "house sparrow"}}, "I think it's a house sparrow."],
];

export function nlg(moves: Move[]): string {
  console.log("generating moves", moves);
  function generateMove(move: Move): string {
    if (
      move.type === "ask" &&
      move.content.text
    ) {
      return move.content.text;
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

/** NLU mapping function can be replaced by statistical NLU
 */
export function nlu(utterance: string): Move[] {
  return nluMapping[utterance.toLowerCase()] || []; // here is returned the empty array in case not understanding
}

export async function getBird(utterance: string): Promise<bird[]> {
  console.log("[NLU] Query");
  const embedding = await openai.embeddings
    .create({
      model: "qwen3-embedding",
      input: utterance,
      dimensions: 384,
    })
    .then((result) => result.data[0].embedding);
  const points = (await client.query("birdsDBtest", {
    with_payload: true,
    query: embedding,
    limit: 2,
  })).points;
  if (points.length === 0) {
    console.log("[NLU] No result")
    
  };
  const retrieved_birds : bird[] = points.map((item) => ({
    id: Number(item.id),
    speciesname: item.payload!.speciesname as string,
    scientificname: item.payload!.scientificname as string,
    location: item.payload!.location as string[],
    habitat: item.payload!.habitat as string[],
    size: item.payload!.size as 'XS' | 'S' | 'M' | 'L',
    status: item.payload!.status as 'Critically Endangered' | 'Endangered' | 'Vulnerable' |
            'Near Threatened' | 'Conservation Dependent' | 'Least Concern',
    description: item.payload!.description as string,
  }));
  const score = points[0].score
  console.log("[NLU] Result:", retrieved_birds);
  /*
  if (score < 0.6) {
    console.log(`[NLU] Result rejected, score ${score} < 0.6`);
     }
  console.log(`[NLU] Result accepted -> bird: ${retrieved_birds.speciesname}`);
  */
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
  If the answer corresponds to a location, use type 'answer' with predicate 'user_location' in case of a Proposition.
  
  Allowed move types are exactly:
  - "greet",
  - "answer",
  - "ask"

  Allowed predicates are exactly:
  - "favorite_food"
  - "user_location"
  - "bird_description"
  - "observed_bird"

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

  User: "what's your favorite food?"
  Output:
  [
    {
      "type": "ask",
      "content": {
        "type": "whq",
        "predicate": "favorite_food"
      }
    }
  ]

  User: "pizza"
  Output:
  [
    {
      "type": "answer",
      "content": "pizza"
    }
  ]

  User: "sweden"
  Output:
  [
    {
      "type": "answer",
      "content": "sweden"
    }
  ]

  User: "i'm in gothenburg"
  Output:
  [
    {
      "type": "answer",
      "content": {
        "predicate": "user_location",
        "argument":"gothenburg"
      }
    }
  ]

  User: "france"
  Output:
  [
    {
      "type": "answer",
      "content": "france"
    }
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
    (bird) => `${bird.speciesname}: ${bird.description}`
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