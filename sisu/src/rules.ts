import {
  Question,
  TotalInformationState,
  InformationState,
  Move,
  Action,
  Proposition
} from "./types";
import { relevant, resolves, combine } from "./semantics";
import { objectsEqual } from "./utils";

type Rules = {
  [index: string]: (
    context: TotalInformationState
  ) => ((x: void) => InformationState) | undefined;
};

export const rules: Rules = {
  clear_agenda: ({ is }) => {
    return () => ({
      ...is,
      private: { ...is.private, agenda: [] },
    });
  },

  /**
   * Grounding
   */
  get_latest_move: (context) => {
    return () => ({
      ...context.is,
      shared: {
        ...context.is.shared,
        lu: {
          moves: context.latest_moves!,
          speaker: context.latest_speaker!,
        },
      },
    });
  },

  /**
   * Integrate
   */
  /** rule 5.1 */
  integrate_usr_request: ({ is }) => {
    if (is.shared.lu!.speaker === "usr") {
      for (const move of is.shared.lu!.moves) {
        if (move.type === "request") {
          let action = move.content;
          for (const planInfo of is.domain.plans) {
            if (planInfo.type == "action" && planInfo.content == action) {
              return () => ({
                ...is,
                private: {
                  ...is.private,
                  agenda: planInfo.plan.concat(is.private.agenda),
                },
              });
            }
          }
        }
      }
    }
  },

  /** rule 2.2 */
  integrate_sys_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "sys") {
      for (const move of is.shared.lu!.moves) {
        if (move.type === "ask") {
          const q = move.content;
          // do not push the question if already on top of qud
          if (is.shared.qud[0] && objectsEqual(is.shared.qud[0], q)) {
            return () => is;
          }
          return () => ({
            ...is,
            shared: {
              ...is.shared,
              qud: [q, ...is.shared.qud],
            },
          });
        }
      }
    }
  },

  /** rule 2.3 */
  integrate_usr_ask: ({ is }) => {
    if (is.shared.lu!.speaker === "usr") {
      for (const move of is.shared.lu!.moves) {
        if (move.type === "ask") {
          const question = move.content;
          const respondAction: { type: "respond"; content: Question } = {
            type: "respond",
            content: question,
          };
          return () => ({
            ...is,
            shared: {
              ...is.shared,
              qud: [question, ...is.shared.qud],
            },
            private: {
              ...is.private,
              agenda: [respondAction, ...is.private.agenda],
            },
          });
        }
      }
    }
  },

  /** rule 2.4 */
  integrate_answer: ({ is }) => {
    const topQUD = is.shared.qud[0];
    if (topQUD) {
      const plannedQuestions = is.private.plan.filter((action) =>
        action.type === "findout" && action.content).map((action) => action.content);
      let propositions = []
      for (const move of is.shared.lu!.moves) {
        if (move.type === "answer") {
          const a = move.content;
          if (relevant(is.domain, a, topQUD)) {
            let proposition = combine(is.domain, topQUD, a);
            propositions.push(proposition)
          }
          else {
            const q = plannedQuestions.find(q => relevant(is.domain, a, q!))
            if (q) {
              let prop = combine(is.domain, q, a);
              propositions.push(prop)
            }
          }
        }  
      }
      return () => ({
        ...is,
        shared: {
          ...is.shared,
          com: [...propositions, ...is.shared.com],
        },
      });
    }
  },

  /** rule 2.6 */
  integrate_greet: ({ is }) => {
    for (const move of is.shared.lu!.moves) {
      if (move.type === "greet") {
        return () => ({
          ...is,
        });
      }
    }
  },

  /** TODO rule 2.7 integrate_usr_quit */

  /** TODO rule 2.8 integrate_sys_quit */

  /**
   * DowndateQUD
   */
  /** rule 2.5 */
  downdate_qud: ({ is }) => {
    const q = is.shared.qud[0];
    if (q) {
      for (const p of is.shared.com) {
        if (resolves(p, q)) {
          return () => ({
            ...is,
            shared: {
              ...is.shared,
              qud: [...is.shared.qud.slice(1)],
            },
          });
        }
      }
    }
  },

  /**
   * ExecPlan
   */
  /** rule 2.9 */
  find_plan: ({ is }) => {
    if (is.private.agenda.length > 0) {
      const action = is.private.agenda[0];
      if (action.type === "respond") {
        const question = action.content;
        for (const planInfo of is.domain.plans) {
          if (
            planInfo.type == "issue" &&
            objectsEqual(planInfo.content, question)
          ) {
            return () => ({
              ...is,
              private: {
                ...is.private,
                agenda: is.private.agenda.slice(1),
                plan: planInfo.plan,
              },
            });
          }
        }
      }
    }
  },

  /** rule 2.10 */
  remove_findout: ({ is }) => {
    if (is.private.plan.length > 0) {
      const action = is.private.plan[0];
      if (action.type === "findout") {
        const question = action.content as Question;
        for (let proposition of is.shared.com) {
          if (resolves(proposition, question)) {
            /*if (question.predicate === "bird_description"
              && question.text
              && is.retrievedBirds
              && is.retrievedBirds.length > 1) {
                return
              }*/
            return () => ({
              ...is,
              private: {
                ...is.private,
                plan: is.private.plan.slice(1),
              },
            });
          }
        }
      }
    }
  },

  /** rule 2.11 */
  exec_consultDB: ({ is }) => {
    if (is.private.plan.length > 0) {
      const action = is.private.plan[0];
      if (action.type === "consultDB") {
        const question = action.content as Question;
        const birds = is.retrievedBirds ?? [];
        const bird_question = is.generatedBirdQuestion
        const result = is.database.consultDB(
          question,
          is.shared.com,
          birds,
          bird_question
        );
        if (result!.type === "identified") {
          const propositionFromDB = result!.proposition
          return () => ({
            ...is,
            private: {
              ...is.private,
              plan: [...is.private.plan.slice(1)],
              bel: [...is.private.bel, propositionFromDB],
            },
          });
        }
        if (result!.type === "moreInfo_needed") {
          return () => ({
            ...is,
            private: {
                ...is.private,
                plan: [
                    ...result!.actions,
                    ...is.private.plan.slice(1),
                ],
            },
            generatedBirdQuestion: undefined
          });
        }
        if (result!.type === "no_match") {
          const proposition = { predicate: "observed_bird", argument: "unknown" }
          return () => ({
            ...is,
            private: {
              ...is.private,
              plan: [...is.private.plan.slice(1)],
              bel: [...is.private.bel, proposition],
            },
          });
        }
      }
    }
  },

  /**
   * Select
   */
  /** rule 2.12 */
  select_from_plan: ({ is }) => {
    if (is.private.agenda.length === 0 && !!is.private.plan[0]) {
      const action = is.private.plan[0];
      return () => ({
        ...is,
        private: {
          ...is.private,
          agenda: [action, ...is.private.agenda],
        },
      });
    }
  },

  /** rule 2.13 */
  select_ask: ({ is }) => {
    let newIS = is;
    if (
      is.private.agenda[0] &&
      ["findout", "raise"].includes(is.private.agenda[0].type)
    ) {
      const q = is.private.agenda[0].content as Question;
      if (is.private.plan[0] && is.private.plan[0].type === "raise") {
        newIS = {
          ...is,
          next_moves: [...is.next_moves, { type: "ask", content: q }],
          private: { ...is.private, plan: [...is.private.plan.slice(1)] },
        };
      } else {
        newIS = {
          ...is,
          next_moves: [...is.next_moves, { type: "ask", content: q }],
        };
      }
      return () => newIS;
    }
  },

  /** rule 2.14 */
  select_respond: ({ is }) => {
    if (
      is.private.agenda.length === 0 &&
      is.private.plan.length === 0 &&
      is.shared.qud[0]
    ) {
      const topQUD = is.shared.qud[0];
      for (const bel of is.private.bel) {
        if (
          !is.shared.com.some((x) => objectsEqual(x, bel)) &&
          relevant(is.domain, bel, topQUD)
        ) {
          const respondAction: Action = { type: "respond", content: topQUD };
          return () => ({
            ...is,
            private: {
              ...is.private,
              agenda: [respondAction, ...is.private.agenda],
            },
          });
        }
      }
    }
  },

  select_answer: ({ is }) => {
    if (is.private.agenda[0] && is.private.agenda[0].type === "respond") {
      const question = is.private.agenda[0].content as Question;
      for (const bel of is.private.bel) {
        if (
          !is.shared.com.some((x) => objectsEqual(x, bel)) &&
          relevant(is.domain, bel, question)
        ) {
          const answerMove: Move = { type: "answer", content: bel };
          return () => ({
            ...is,
            next_moves: [...is.next_moves, answerMove],
          });
        }
      }
    }
  },

  /** only for greet for now */
  select_other: ({ is }) => {
    if (is.private.agenda[0] && is.private.agenda[0].type === "greet") {
      return () => ({
        ...is,
        next_moves: [...is.next_moves, is.private.agenda[0] as Move],
      });
    }
  },

  /** new rule for negative understanding feedback */
  select_nounderstanding_feedback: (tis) => {
    const latestMove = tis.latest_moves;
    if (Array.isArray(latestMove) && latestMove.length === 0)  { 
      const noUnderstandingFeedbackMove: Move = { type: "noUnderstandingFeedback", content: null };
      const qud = tis.is.shared.qud[0]; 
      let moves: Move[] = [noUnderstandingFeedbackMove];
      if (qud) {
        moves.push({ type: "ask", content: qud });
      }
      return () => ({
        ...tis.is,
        next_moves: moves,
      });
    }
  },

  /** new rule for negative contact feedback */
  select_noinput_feedback: (tis) => {
    const latestMove = tis.latest_moves?.[0];
    if (latestMove?.type === "noInput")  { 
      const noInputFeedbackMove: Move = { type: "noInputFeedback", content: null };
      const qud = tis.is.shared.qud[0]; 
      let moves: Move[] = [noInputFeedbackMove];
      if (qud) {
        moves.push({ type: "ask", content: qud });
      }
      return () => ({
        ...tis.is,
        next_moves: moves,
      });
    }
  },

  /* new rule to integrate retrieved birds and answer*/
  integrate_retrieved_birds: ({ is, retrievedBirds }) => {
    const topQUD = is.shared.qud[0];
    if (topQUD && retrievedBirds) {
      for (const move of is.shared.lu!.moves) {
        if (move.type === "answer") {
          const a = move.content;
          if (relevant(is.domain, a, topQUD)) {
            let proposition = combine(is.domain, topQUD, a);
            return () => ({
              ...is,
              shared: {
                ...is.shared,
                com: [proposition, ...is.shared.com],
              },
              retrievedBirds: retrievedBirds
            });
          }
        }
      }
    }
  },

  /* new rule to integrate bird question generated */
  integrate_bird_question: ({ is, generatedBirdQuestion }) => {
    if (generatedBirdQuestion) {
      return () => ({
        ...is,
        generatedBirdQuestion: generatedBirdQuestion,
        domain: {
          ...is.domain,
          predicates: {
            ...is.domain.predicates,
            [generatedBirdQuestion.predicate]: generatedBirdQuestion.predicate
          },
          openSorts: [...is.domain.openSorts, generatedBirdQuestion.predicate]
        }
      });
    }
  },

}
