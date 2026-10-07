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
  [{ type: "ask", content: WHQ("description") }, "What do you see?"],
  [{ type: "answer", content: {predicate: "observed_bird", argument: "eurasian blue tit"}}, "I think it's a blue tit."],
];

export function nlg(moves: Move[]): string {
  console.log("generating moves", moves);
  function generateMove(move: Move): string {
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
    limit: 1,
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
  const instructions: string =
  `Map the user utterance below into a list of moves.
  Do not add anything else than the list of objects move. No explanation. No introduction. Start with [ and end with ].
  Use ONLY the following types and predicates, do not create new move label.
  For questions, use only given predicates.
  For answers, use only given predicates, and retrieve the string to fill in the argument of the proposition or the shortanswer.
  If the answer corresponds to a bird description, insert use type 'answer' with predicate 'description' and the user utterance as argument.
  type Move = OtherMove | AnswerMove | AskMove ;
  interface OtherMove {
    "type": "greet" ;
    "content": null | string;
  } ;
  interface AnswerMove {
    "type": "answer";
    "content": Proposition | ShortAnswer;
  } ;
  interface AskMove {
    "type": "ask";
    "content": WhQuestion;
  } ;
  type ShortAnswer = string;
  type Proposition = {
    "predicate": string;
    "argument": string;
};
  type WhQuestion = { "type": "whq"; "predicate": string };
  const predicates = {
    favorite_food,
    user_location,
    bird_description,
    observed_bird,
  };
  function WHQ(predicate: string): Question {
    return {
      "type": "whq",
      "predicate": predicate,
    };
  }

  Examples:
   NLUMapping = {
  "what is this bird?": [
    {
      "type": "ask",
      "content": WHQ("observed_bird")
    }
  ],
  "what's your favorite food?": [
    {
      "type": "ask",
      "content": WHQ("favorite_food")
    }
  ],
  pizza: [
    {
      "type": "answer",
      "content": "pizza"
    }
  ],
  "sweden": [
    {
      "type": "answer",
      "content": "sweden"
    }
  ],
  "i see a small bird with a blue crown": [
    {
      "type": "answer",
      "content": {
        "predicate": "description",
        "argument": "i see a small bird with a blue crown"
      }
    }
  ],
};

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