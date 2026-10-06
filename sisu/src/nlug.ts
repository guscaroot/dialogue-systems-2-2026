import { Move } from "./types";
import { objectsEqual, WHQ } from "./utils";
import { QdrantClient } from "@qdrant/js-client-rest";
import OpenAI from "openai";

/*const client = new QdrantClient({ host: "localhost", port: 6333 });*/

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
/*
export async function nluQdrant(utterance: string): Promise<Move[]> {
  console.log("[NLU] Query");
  const embedding = await openai.embeddings
    .create({
      model: "qwen3-embedding",
      input: utterance,
      dimensions: 384,
    })
    .then((result) => result.data[0].embedding);
  const points = (await client.query("NLUdata", {
    with_payload: true,
    query: embedding,
    limit: 1,
  })).points;
  if (points.length === 0) {
    console.log("[NLU] No result")
    return []
  };
  const retrieved_nlu = points.map((item) => ({
    utterance: item.payload?.utterance,
    move: item.payload?.move as Move,
    score: item.score
  }));
  console.log("[NLU] Result:", points[0]);
  if (retrieved_nlu[0].score < 0.6) {
    console.log(`[NLU] Result rejected, score ${retrieved_nlu[0].score} < 0.6`);
    return [] }
  console.log(`[NLU] Result accepted -> move: ${retrieved_nlu[0].move}`);
  return [retrieved_nlu[0].move]
}
*/

export async function nluLLM(utterance: string) : Promise<Move[]> {
  const instructions: string =
  `Map the user utterance below into a list of moves.
  Do not add anything else than the list of objects move. No explanation. No introduction. Start with [ and end with ].
  Use ONLY the following types and predicates, do not create new move label.
  For questions, use only given predicates.
  For answers, use only given predicates, and retrieve the string to fill in the argument of the proposition or the shortanswer.
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
    booking_room,
    booking_course,
    booking_day,
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
      "content": WHQ("observed_bird"),
    },
  ],
  "where is the lecture?": [
    {
      "type": "ask",
      "content": WHQ("booking_room"),
    },
  ],
  "what's your favorite food?": [
    {
      "type": "ask",
      "content": WHQ("favorite_food"),
    },
  ],
  pizza: [
    {
      "type": "answer",
      "content": "pizza",
    },
  ],
  "dialogue systems 2": [
    {
      "type": "answer",
      "content": "LT2319",
    },
  ],
  "friday": [
    {
      "type": "answer",
      "content": "friday",
    },
  ],
  "sweden": [
    {
      "type": "answer",
      "content": "sweden",
    },
  ],
  "i see a small bird with a blue crown": [
    {
      "type": "answer",
      "content": "i see a small bird with a blue crown",
    },
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