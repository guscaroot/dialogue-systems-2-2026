import { InformationState } from "./types";
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
    description: "description",
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
            findout(WHQ("description")),
            consultDB(WHQ("observed_bird")),
          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts, birds) => {
        if (objectsEqual(question, WHQ("observed_bird"))) {
          /*const location = getFactArgument(facts, "user_location");
          console.log(location)
          const description = getFactArgument(facts, "description");
          console.log(description)
      
          if (birdsDB.some(i => ((i.location).some(j=>j===location) && i.description.includes(`${description}`)))) {
            const bird = birdsDB.find(i => ((i.location).some(j=>j===location) && i.description.includes(`${description}`)))
            const birdname = bird?.speciesname
            console.log(birdname)

            return { predicate: "observed_bird", argument: birdname!  };
          };
        };
        return null */
        
        if (birds && birds.length ===1) {
          const birdname = birds[0].speciesname
          return { predicate: "observed_bird", argument: birdname }
        }
        return null
        }
        return null;
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
    retrievedBirds: [],
  };
};
