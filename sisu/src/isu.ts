import { createActor, setup, AnyMachineSnapshot, sendTo, assign, fromPromise } from "xstate";
import { Settings, speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";
import { DMContext, DMEvent, NextMovesEvent, Move } from "./types";
import { getBird, nlg, nlu, nluLLM,  } from "./nlug"; // nluQdrant
import { dme } from "./dme";
import { initialIS } from "./is";
import { bird }from "./birds-database"

const {inspect} = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://francecentral.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings: Settings = {
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  azureRegion: "francecentral",
  ttsDefaultVoice: "en-US-DavisNeural",
  bargeIn: false
};

const dmMachine = setup({
  actors: {
    dme: dme,
    /*nluQdrant: fromPromise<Move[], string>(async ({input}) => {
      return await nluQdrant(input)
    },),*/
    nluLLM: fromPromise<Move[], string>(async ({input}) => {
      return await nluLLM(input)
    },),
    getBird: fromPromise<bird[], string>(async ({input}) => {
      return await getBird(input)
    },),
  },
  actions: {
    speak_next_moves: ({ context, event }) =>
      context.ssRef.send({
        type: "SPEAK",
        value: {
          utterance: nlg((event as NextMovesEvent).value),
        },
      }),
    listen: ({ context }) =>
      context.ssRef.send({
        type: "LISTEN",
      }),
  },
  types: {} as {
    context: DMContext;
    events: DMEvent;
  },
}).createMachine({
  context: ({ spawn }) => {
    return {
      ssRef: spawn(speechstate, { input: settings }),
      is: initialIS(),
    };
  },
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.ssRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: {
        CLICK: "Main",
      },
    },
    Main: {
      type: "parallel",
      states: {
        Interpret: {
          initial: "Idle",
          states: {
            Idle: {
              on: {
                SPEAK_COMPLETE: { target: "Recognising", actions: "listen" },
              },
            },
            Recognising: {
              on: {
                LISTEN_COMPLETE: [
                  {
                    guard: ({ context }) => context.lastUserUtterance !== undefined,
                    target: "ProcessingNLU",
                    actions: () => console.log("[NLU] Starting NLU")
                  },
                  {
                  target: "Idle",
                  actions: sendTo("dmeID", ({ context }) => ({
                    type: "SAYS",
                    value: {
                      speaker: "usr",
                      moves: context.lastUserMoves,
                    },
                  })),
                  },
                ],
                RECOGNISED: {
                  actions: [
                    ({ event }) => console.log("[ASR] RECOGNISED", event.value[0].utterance),
                    assign(({ event }) => ({
                    lastUserUtterance: event.value[0].utterance,
                    /*lastUserMoves: nlu(event.value[0].utterance),*/
                    })),
                  ]
                },
                ASR_NOINPUT: {
                  // TODO
                  actions: [
                    () => console.log("[ASR] NO INPUT"),
                    assign({
                    lastUserMoves: [{type: "noInput", content: null}],
                    lastUserUtterance: undefined
                    }),
                  ]
                },
              },
            },
            /*ProcessingNLU: {
              invoke: {
                src: "nluQdrant",
                input: ({ context }) => context.lastUserUtterance!,
                onDone: {
                  target: "Idle",
                  actions: [
                    () => console.log("[NLU] Complete"),
                    assign(({ event }) => ({
                      lastUserMoves: event.output,
                      lastUserUtterance: undefined,
                    })),
                    sendTo("dmeID", ({ event }) => ({
                      type: "SAYS",
                      value: {
                        speaker: "usr",
                        moves: event.output,
                      },
                    })),
                  ]
                }
              }
            },*/
            ProcessingNLU: {
              invoke: {
                src: "nluLLM",
                input: ({ context }) => context.lastUserUtterance!,
                onDone: [
                {
                  guard: ({ event }) => event.output.some(
                    i => i.type === 'answer' && 
                    typeof i.content === 'object' && 
                    i.content?.predicate === 'description'),
                  target: "GettingBird",
                  actions: [
                  () => console.log("[NLU] Starting bird recognition"),
                  assign(({ event }) => ({
                    lastUserMoves: event.output,
                  })),
                  ]
                },
                {
                  target: "Idle",
                  actions: [
                    () => console.log("[NLU] Complete"),
                    assign(({ event }) => ({
                      lastUserMoves: event.output,
                      lastUserUtterance: undefined,
                    })),
                    sendTo("dmeID", ({ event }) => ({
                      type: "SAYS",
                      value: {
                        speaker: "usr",
                        moves: event.output,
                      },
                    })),
                  ]
                }
              ]
              }
            },
            GettingBird: {
              invoke: {
                src: "getBird",
                input: ({ context }) => context.lastUserUtterance!,
                onDone: {
                  target: "Idle",
                  actions: [
                    () => console.log("[NLU] Bird recognition complete"),
                    assign({
                      is: ({ context, event }) => ({
                        ...context.is,
                        retrievedBirds: event.output,
                      }),
                    })
                    ,
                    assign(() => ({
                      lastUserUtterance: undefined,
                    })),
                    sendTo("dmeID", ({ context }) => ({
                      type: "SAYS",
                      value: {
                        speaker: "usr",
                        moves: context.lastUserMoves,
                      },
                    })),
                  ]
                }
              }
            },
          }
        },
        Generate: {
          initial: "Idle",
          states: {
            Idle: {
              on: {
                NEXT_MOVES: {
                  target: "Speaking",
                  actions: sendTo("dmeID", ({ event }) => ({
                    type: "SAYS",
                    value: {
                      speaker: "sys",
                      moves: event.value,
                    },
                  })),
                },
              },
            },
            Speaking: {
              entry: "speak_next_moves",
              on: {
                SPEAK_COMPLETE: {
                  target: "Idle",
                },
              },
            },
          },
        },
        DME: {
          invoke: {
            src: "dme",
            id: "dmeID",
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
    },
  },
});

export const dmActor = createActor(dmMachine, {
  inspect,
}).start();

let is = dmActor.getSnapshot().context.is;
console.log("[IS (initial)]", is);
dmActor.subscribe((snapshot: AnyMachineSnapshot) => {
  /* if you want to log some parts of the state */
  // is !== snapshot.context.is && console.log("[IS]", snapshot.context.is);
  is = snapshot.context.is;
  // console.log("IS", is);
  console.log(
    "%cState value:",
    "background-color: #056dff",
    JSON.stringify(snapshot.value, null, 2),
    snapshot.context.is
  );
});

export function setupButton(element: HTMLElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
  dmActor
    .getSnapshot()
    .context.ssRef.subscribe((snapshot: AnyMachineSnapshot) => {
      element.innerHTML = `${Object.values(snapshot.getMeta())[0]["view"]}`;
    });
}
