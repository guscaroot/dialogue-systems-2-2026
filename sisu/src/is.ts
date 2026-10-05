import { InformationState } from "./types";
import {
  objectsEqual,
  WHQ,
  findout,
  consultDB,
  getFactArgument,
} from "./utils";
import { bird, birdsDB } from "./birds-database";

export const initialIS = (): InformationState => {
  const predicates: { [index: string]: string } = {
    // Mapping from predicate to sort
    favorite_food: "food",
    booking_course: "course",
    booking_day: "day",
    location: "location",
    description: "description",
    observed_bird: "bird",
  };
  const individuals: { [index: string]: string } = {
    // Mapping from individual to sort
    pizza: "food",
    LT2319: "course",
    friday: "day",
    thursday: "day",
    tuesday: "day",
    sweden: "location",
    "blue crown": "description",
    eurasianbluetit: "bird",
  };
  return {
    domain: {
      predicates: predicates,
      individuals: individuals,
      plans: [
        {
          type: "issue",
          content: WHQ("booking_room"),
          plan: [
            findout(WHQ("booking_day")),
            findout(WHQ("booking_course")),
            consultDB(WHQ("booking_room")),
          ],
        },
        {
          type: "issue",
          content: WHQ("observed_bird"),
          plan: [
            findout(WHQ("location")),
            findout(WHQ("description")),
            consultDB(WHQ("observed_bird")),
          ],
        },
      ],
    },
    database: {
      consultDB: (question, facts) => {
        if (objectsEqual(question, WHQ("booking_room"))) {
          const day = getFactArgument(facts, "booking_day");
          const course = getFactArgument(facts, "booking_course");
          if (day == "friday" && course == "LT2319") {
            return { predicate: "booking_room", argument: "G212" };
          };
          if ((day == "thursday" || day == "tuesday") && course == "LT2319") {
            return { predicate: "booking_room", argument: "J440" };
          };
        };
        
        if (objectsEqual(question, WHQ("observed_bird"))) {
          const location = getFactArgument(facts, "location");
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
  };
};
