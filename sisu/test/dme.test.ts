import { setup, createActor, sendTo, assign, waitFor, fromPromise } from "xstate";
import { describe, expect, test } from "vitest";
import { DMEContext, DMEEvent, NextMovesEvent, Move } from "../src/types";
import { dme } from "../src/dme";
import { nlu, nlg, nluLLM, getBird } from "../src/nlug";
import { initialIS } from "../src/is";
import { bird } from "../src/birds-database";

interface Turn {
  speaker: string;
  message: string;
}

interface TestContext extends DMEContext {
  dialogue: Turn[];
  lastUserUtterance?: string;
  lastUserMoves?: Move[];
}

describe("DME tests", () => {
  const machine = setup({
    actors: {
      dme: dme,
      nluLLM: fromPromise<Move[], string>(async ({ input }) => {
      return await nluLLM(input);
    }),

    getBird: fromPromise<bird[], string>(async ({ input }) => {
      return await getBird(input);
    }),
    },
    actions: {
      notify: assign(
        ({ context }, params: { speaker: string; message: string }) => {
          console.log("[TEST] notify called:", params);
          console.log("[TEST] Dialogue length before:", context.dialogue.length)
          const dialogue = [...context.dialogue, params];
          console.log("[TEST] Dialogue length after:", dialogue.length);
          return { dialogue: [...context.dialogue, params] };
        }
      ),
    },
    types: {} as {
      context: TestContext;
      events: 
      | DMEEvent 
      | { type: "INPUT"; value: string }
      | { type: "NO_INPUT"};
    },
  }).createMachine({
    context: {
      dialogue: [],
      parentRef: null,
      is: initialIS(),
      lastUserUtterance: undefined,
      lastUserMoves: undefined,
    },
    initial: "DME",
    type: "parallel",
    states: {
      TestInterface: {
        initial: "WaitingForInput",
        on:{
          NEXT_MOVES: {
                actions: [
                  {
                    type: "notify",
                    params: ({ event }) => ({
                      speaker: "sys",
                      message: nlg(
                        (event as NextMovesEvent).value
                      ),
                    }),
                    //delay: 2000
                  },
                  sendTo(
                    "dmeTestID",
                    ({ event }) => ({
                      type: "SAYS",
                      value: {
                        speaker: "sys",
                        moves:
                          (event as NextMovesEvent).value,
                      },
                    }),
                    //{ delay: 1000 }
                  ),
                ],
              },
        },
        states: {
          WaitingForInput: {
            on: {
              INPUT: {
                target: "ProcessingInput",
                actions: [
                  assign(({ event }) => ({
                    lastUserUtterance: event.value,
                  })),
                  {
                    type: "notify",
                    params: ({ event }) => ({
                      speaker: "usr",
                      message: event.value,
                    }),
                  },
                ],
              },
              NO_INPUT: {
                actions: [
                  () => console.log("[TEST] NO_INPUT transition entered"),
                  ()=> console.log("[TEST] Preparing no-input notification"),
                  {
                    type: "notify",
                    params: () => ({
                      
                      speaker: "usr",
                      message: "*noinput*",
                    }),
                  },
                  () => console.log("[TEST] notify action completed"),
                  () => console.log("[TEST] Forwarding SAYS to DME"),
                  sendTo("dmeTestID", {
                    type: "SAYS",
                    value: {
                      speaker: "usr",
                      moves: [
                        {
                          type: "noInput",
                          content: null,
                        },
                      ],
                    },
                  }),
                  () => console.log("[TEST] SAYS event sent to dmeTestID")
                ],
              },
              
            },
          },
          ProcessingInput: {
            invoke: {
              src: "nluLLM",
              input: ({ context }) => context.lastUserUtterance!,
              onDone: [
                {
                  guard: ({ event }) => event.output.some(
                    i => i.type === 'answer' && 
                    typeof i.content === 'object' && 
                    i.content?.predicate === 'bird_description'),
                  target: "GettingBird",
                  actions: [
                    assign(({ event }) => ({
                      lastUserMoves: event.output,
                    })),
                  ],
                },
                {
                  target: "WaitingForInput",
                  actions: [
                    assign(({ event }) => ({
                      lastUserMoves: event.output,
                      lastUserUtterance: undefined,
                    })),
                    sendTo("dmeTestID", ({ event }) => ({
                      type: "SAYS",
                      value: {
                        speaker: "usr",
                        moves: event.output,
                      },
                    })),
                  ],
                },
              ],
            },
          },
          GettingBird: {
            invoke: {
              src: "getBird",
              input: ({ context }) => context.lastUserUtterance!,
              onDone: {
                target: "WaitingForInput",
                actions: [
                  assign(() => ({
                    lastUserUtterance: undefined,
                  })),
                  sendTo(
                    "dmeTestID",
                    ({ event, context }) => ({
                      type: "BIRDS_RETRIEVED",
                      value: {
                        birds: event.output,
                        speaker: "usr",
                        moves: context.lastUserMoves,
                      },
                    })
                  ),
                ],
              },
            },
          },
        },
      },
      DME: {
        invoke: {
          src: "dme",
          id: "dmeTestID",
          input: ({ context, self }) => {
            return {
              parentRef: self,
              latest_moves: context.latest_moves,
              latest_speaker: context.latest_speaker,
              is: context.is,
            };
          },
        },
      },
    },
  });

  const runTest = (turns: Turn[]) => {
    let expectedSoFar: Turn[] = [];
    const actor = createActor(machine).start();
    test.each(turns)("$speaker> $message", async (turn) => {
      expectedSoFar.push(turn);
      if (turn.speaker === "usr") {
        console.info("user input: ", turn.message);
        if (turn.message === '*noinput*') {
  console.log("[TEST] Before NO_INPUT");

  console.log(
    "[TEST] Current state:",
    JSON.stringify(actor.getSnapshot().value, null, 2)
  );

  console.log(
    "[TEST] Current dialogue length:",
    actor.getSnapshot().context.dialogue.length
  );

  console.log("[TEST] Sending NO_INPUT");

  actor.send({ type: "NO_INPUT" });

  console.log("[TEST] After NO_INPUT");

  console.log(
    "[TEST] State after NO_INPUT:",
    JSON.stringify(actor.getSnapshot().value, null, 2)
  );

  console.log(
    "[TEST] Dialogue after NO_INPUT:",
    JSON.stringify(actor.getSnapshot().context.dialogue, null, 2)
  );
} else {
  actor.send({ type: "INPUT", value: turn.message });
}

        
      }
      console.log(
  "[TEST] Expected:",
  JSON.stringify(expectedSoFar, null, 2)
);

console.log(
  "[TEST] Actual:",
  JSON.stringify(actor.getSnapshot().context.dialogue, null, 2)
);

console.log(
  "[TEST] Expected length:",
  expectedSoFar.length
);

console.log(
  "[TEST] Actual length:",
  actor.getSnapshot().context.dialogue.length
);
      const snapshot = await waitFor(
        actor,
        (snapshot) => snapshot.context.dialogue.length === expectedSoFar.length,
        {
          timeout: 30000 // allowed time to transition to the expected state ,
        }
      );
      expect(snapshot.context.dialogue).toEqual(expectedSoFar);
    },
    35000 // Vitest test timeout
  );
  };

  describe("system answer from beliefs", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "What's your favorite food?" },
      { speaker: "sys", message: "Pizza." },
    ]);
  });


  describe("bird observation - blue tit", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "What is this bird?" },
      { speaker: "sys", message: "Where are you?" },
      { speaker: "usr", message: "Sweden" },
      { speaker: "sys", message: "What do you see?" },
      { speaker: "usr", message: "I see a small bird with a blue crown" },
      { speaker: "sys", message: "I think it's a blue tit." },
    ]);
  });

  describe("bird observation - grey heron", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "I want help to identify some bird" },
      { speaker: "sys", message: "Where are you?" },
      { speaker: "usr", message: "I'm in Sweden" },
      { speaker: "sys", message: "What do you see?" },
      { speaker: "usr", message: "It's a big bird with a long neck and long legs, and it is white grey" },
      { speaker: "sys", message: "I think it's a grey heron." },
    ]);
  });

  describe("bird observation - house sparrow", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "Please assist me in identifying a bird" },
      { speaker: "sys", message: "Where are you?" },
      { speaker: "usr", message: "I'm in Sweden" },
      { speaker: "sys", message: "What do you see?" },
      { speaker: "usr", message: "The bird is quite small and brown, reddish on the head" },
      { speaker: "sys", message: "I think it's a house sparrow." },
    ]);
  });
/*
  describe("bird observation + negative contact feedback + repeated question", () => {
    runTest([
      { speaker: "sys", message: "Hello! You can ask me anything!" },
      { speaker: "usr", message: "What is this bird?" },
      { speaker: "sys", message: "Where are you?" },
      { speaker: "usr", message: "*noinput*" },
      { speaker: "sys", message: "Sorry, I didn't hear you. Where are you?" },
      { speaker: "usr", message: "Sweden" },
      { speaker: "sys", message: "What do you see?" },
      { speaker: "usr", message: "I see a small bird with a blue crown" },
      { speaker: "sys", message: "I think it's a blue tit." },
    ]);
  });
*/
});
