import { setup, assign, sendTo, AnyTransitionConfig } from "xstate";
import { rules } from "./rules";
import { SaysMovesEvent, DMEEvent, DMEContext, BirdsRetrievedEvent } from "./types";

/**
 * Creates a transition with a guarded ISU.
 *
 * @param nextState Target state.
 * @param ruleName Name of ISU rule.
 * @param [sendBackNextMoves=false] If `true`, communicate next move to the parent machine.
 */
function isuTransition(
  nextState: string,
  ruleName: string,
  sendBackNextMoves: boolean = false
): AnyTransitionConfig {
  return {
    target: nextState,
    guard: { type: "isu", params: { name: ruleName } },
    actions: [{ type: "isu", params: { name: ruleName } }],
  };
}

export const dme = setup({
  types: {} as {
    input: DMEContext;
    context: DMEContext;
    events: DMEEvent;
  },
  guards: {
    isu: ({ context }, params: { name: string }) =>
      !!rules[params.name](context),
    latestSpeakerIsUsr: ({ context }) => {
      return context.latest_speaker == "usr";
    },
    multipleBirdsRetrieved: ({ event }) =>
    event.type === "BIRDS_RETRIEVED" &&
    event.value.birds.length > 1,
  },
  actions: {
    sendBackNextMoves: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => {
        return {
          type: "NEXT_MOVES",
          value: context.is.next_moves,
        };
      }
    ),
    sendBirdFilters: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => {
        return {
          type: "BIRD_FILTERS_UPDATED",
          value: {
            location: context.is.shared.com.find(
              (com) => com.predicate === "bird_location"
            )?.argument,
            environment: context.is.shared.com.find(
              (com) => com.predicate === "bird_environment"
            )?.argument,
          },
        }
      }
    ),
    isu: assign(({ context }, params: { name: string }) => {
      let ruleName = params.name;
      let newIS = rules[ruleName](context)!(); // we assume that this is never called without a guard
      console.info(`[ISU ${ruleName}]`);
      console.dir(newIS, { depth: null, colors: true });
      return { is: newIS };
    }),
    updateLatestMoves: assign(({ context, event }) => {
      console.log("[DME] updateLatestMoves received:", event);
      console.log("[DME] Current latest_speaker:", context.latest_speaker);
      console.log("[DME] Incoming moves:",JSON.stringify(
        (event as SaysMovesEvent | BirdsRetrievedEvent).value.moves, null, 2));
      console.info("[DM updateLatestMoves]");
      console.dir(event, { depth: null, colors: true });
      return {
        latest_moves: (event as SaysMovesEvent|BirdsRetrievedEvent).value.moves,
        latest_speaker: (event as SaysMovesEvent|BirdsRetrievedEvent).value.speaker,
        is: {
          ...context.is,
          next_moves: [],
        },
      };
    }),
    storeBirdRetrieval: assign(({ event }) => {
        if (event.type !== "BIRDS_RETRIEVED") {
        return {};
      }
      return {
        retrievedBirds: event.value.birds,
      };
    }),
    storeDescription: assign(({ context, event }) => {
      if (event.type !== "BIRDS_RETRIEVED") {
        return {};
      }
      const move = event.value.moves.find(
        (move) =>
          move.type === "answer" &&
          typeof move.content === "object" &&
          move.content.predicate === "bird_description"
      );
      if (move && move.type === "answer" && typeof move.content == "object") {
        const description = move.content.argument
        return {
          is: {
            ...context.is,
            totalDescription: [
              ...context.is.totalDescription,
              description,
            ],
          },
        };
      }
      return {};
    }),
    storeBirdQuestion: assign(({ event }) => {
      if (event.type !== "BIRD_QUESTION_GENERATED") {
        return {};
      }
      return {
        generatedBirdQuestion: event.value,
      };
    }),
  },
}).createMachine({
  context: ({ input }) => {
    return input;
  },
  initial: "Select",
  states: {
    Select: {
      initial: "SelectAction",
      states: {
        SelectAction: {
          always: [
            isuTransition("SelectMove", "select_respond"),
            isuTransition("SelectMove", "select_from_plan"),
            { target: "SelectMove" }, // TODO check it -- needed for greeting
          ],
        },
        SelectMove: {
          always: [
            isuTransition("SelectionDone", "select_noinput_feedback"),
            isuTransition("SelectionDone", "select_nounderstanding_feedback"),
            isuTransition("SelectionDone", "select_ask"),
            isuTransition("SelectionDone", "select_answer"),
            isuTransition("SelectionDone", "select_other"),
            { target: "SelectionDone" },
          ],
        },
        SelectionDone: {
          always: [{ actions: [{ type: "sendBackNextMoves" }] }],
          type: "final",
        },
      },
      onDone: "Update",
    },
    Update: {
      initial: "Init",
      states: {
        Init: {
          always: isuTransition("Grounding", "clear_agenda"),
        },
        Grounding: {
          entry: () => console.log("[DME] Entered Update.Grounding"),
          // TODO: rename to Perception?
          on: {
            SAYS: {
              target: "Integrate",
              actions: [
                () => console.log("[DME] SAYS handler entered"),
                {
                  type: "updateLatestMoves",
                },
                { type: "isu", params: { name: "get_latest_move" } },
              ],
            },
            BIRDS_RETRIEVED: [
              {
                guard: "multipleBirdsRetrieved",
                target: "AwaitBirdQuestion",
                actions: [
                  { type: "storeBirdRetrieval" },
                  { type: "storeDescription" },
                  { type: "updateLatestMoves" },
                  { type: "isu", params: { name: "get_latest_move" } },
                ],
              },
              {
                target: "Integrate",
                actions: [
                  { type: "storeBirdRetrieval" },
                  { type: "storeDescription" },
                  {
                    type: "updateLatestMoves",
                  },
                  { type: "isu", params: { name: "get_latest_move" } },
                ],
              },
            ],
          },
        },
        AwaitBirdQuestion: {
          entry: () => console.log("[DME] Waiting for generated bird question"),
          on: {
            BIRD_QUESTION_GENERATED: {
              target: "IntegrateBirdQuestion",
              actions: { type: "storeBirdQuestion" },
            },
          },
        },
        IntegrateBirdQuestion : {
          entry: ({ context }) => {
    console.log(
      "[DME] IntegrateBirdQuestion entered",
      context.generatedBirdQuestion
    );
  },
          always: [
            isuTransition("Integrate", "integrate_bird_question"),
            { target: "Integrate" },
          ],
        },
        Integrate: {
          always: [
            isuTransition("DowndateQUD", "integrate_usr_request"),
            isuTransition("DowndateQUD", "integrate_sys_ask"),
            isuTransition("DowndateQUD", "integrate_usr_ask"),
            isuTransition("DowndateQUD", "integrate_retrieved_birds"),
            isuTransition("SendBirdFilters", "integrate_answer"),
            isuTransition("DowndateQUD", "integrate_greet"),
            { target: "DowndateQUD" },
          ],
        },
        SendBirdFilters: {
          entry: { type: "sendBirdFilters" },
          always: { target: "DowndateQUD" },
        },
        DowndateQUD: {
          always: [
            isuTransition("LoadPlan", "downdate_qud"),
            isuTransition("LoadPlan", "find_plan"),
            { target: "LoadPlan" },
          ],
        },
        LoadPlan: {
          always: { target: "ExecPlan" },
        },
        ExecPlan: {
          always: [
            isuTransition("ExecPlan", "remove_findout"),
            isuTransition("ExecPlan", "exec_consultDB"),
            { target: "FinalGroup" },
          ],
        },
        FinalGroup: {
          type: "final",
        },
      },
      onDone: [
        {
          target: "Select",
          guard: "latestSpeakerIsUsr",
        },
        { target: "Update" },
      ],
    },
  },
});
