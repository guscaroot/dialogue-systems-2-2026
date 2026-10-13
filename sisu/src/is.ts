import { InformationState, Action } from "./types";
import {
  objectsEqual,
  WHQ,
  findout,
  consultDB,
  getFactArgument,
} from "./utils";
import { bird, birdsDB } from "./birds-database";
import {getBird} from "./nlug"

export const initialIS = (): InformationState => {
  const predicates: { [index: string]: string } = {
    // Mapping from predicate to sort
    user_location: "location",
    bird_description: "description",
    observed_bird: "bird",
  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    sweden: "location",
    //"blue crown": "description",
    eurasianbluetit: "bird",
  };
  const openSorts = ["description"]
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      openSorts: openSorts,
      plans: [
        {
          type: "issue",
          content: WHQ("observed_bird"),
          plan: [
            findout(WHQ("user_location")),
            findout(WHQ("bird_description")),
            consultDB(WHQ("observed_bird")),
          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts, birds, bird_question) => {
        if (objectsEqual(question, WHQ("observed_bird"))) {
        
          if (birds && birds.length === 1) {
            const birdname = birds[0].speciesname.toLowerCase()
            return {
              type: "identified",
              proposition: { predicate: "observed_bird", argument: birdname }
            }
          }
          if (birds && birds.length > 1) {
            const new_plan: Action[] = [
              findout(WHQ("bird_description", bird_question)),
              consultDB(WHQ("observed_bird")),
            ]
            return {
              type: "moreInfo_needed",
              actions: new_plan
            }
          }
          return { type: "no_match" };
          // TO DO: handle no match case
        }
        return null
      },
    },
    next_moves: [],
    private: {
      plan: [],
      agenda: [
        {
          type: "greet",
          content: null,
        },
      ],
      bel: [{ predicate: "favorite_food", argument: "pizza" }],
    },
    shared: { lu: undefined, qud: [], com: [] },
    totalDescription: [],
  };
};
