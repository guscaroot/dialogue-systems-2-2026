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
    bird_location: "location",
    bird_environment: "environment",
    bird_description: "description",
    observed_bird: "bird",
  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    //eurasianbluetit: "bird",
    "northern europe": "location",
    "non-northern europe": "location",
    "north africa": "location",
    "sub-saharan africa": "location",
    "middle-east and western asia": "location",
    "central and south asia": "location",
    "east asia": "location",
    "southeast asia": "location",
    "north america": "location",
    "south america": "location",
    "australia and oceania": "location",
    "forest": "environment",
    "shrubland": "environment",
    "grassland": "environment",
    "agricultural land": "environment",
    "urban and suburban": "environment",
    "freshwater wetlands": "environment",
    "freshwater bodies": "environment",
    "coastal and marine": "environment",
    "tundra and heathland": "environment", 
    "mountains and rocky habitats": "environment",
    "sparsely vegetated terrain": "environment",
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
            findout(WHQ("bird_location")),
            findout(WHQ("bird_environment")),
            findout(WHQ("bird_description")),
            consultDB(WHQ("observed_bird")),
          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts, birds, bird_question?) => {
        if (objectsEqual(question, WHQ("observed_bird"))) {
        
          if (birds && birds.length === 1) {
            const birdname = birds[0].commonName.toLowerCase()
            return {
              type: "identified",
              proposition: { predicate: "observed_bird", argument: birdname }
            }
          }
          if (birds && birds.length > 1 && bird_question) {
            const new_plan: Action[] = [
              findout(WHQ(bird_question.predicate, bird_question.text)),
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
      bel: [],
    },
    shared: { lu: undefined, qud: [], com: [] },
    totalDescription: [],
  };
};
