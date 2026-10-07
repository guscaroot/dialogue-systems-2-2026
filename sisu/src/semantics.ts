import { ShortAnswer, Proposition, Question, Domain } from "./types";

export function relevant(
  domain: Domain,
  a: ShortAnswer | Proposition,
  q: Question
): boolean {
  /*if (
    typeof a === "string" &&
    domain.predicates[q.predicate] === domain.individuals[a]
  ) {
    return true;
  }
  if (typeof a === "object" && q.predicate === a.predicate) {
    return true;
  }
  return false;
}*/

  if (typeof a === "string") {
    const sort = domain.predicates[q.predicate];

    return (
      domain.openSorts.includes(sort) ||
      domain.individuals[a] === sort
    );
  };
  if (typeof a === "object" ) {
    return q.predicate === a.predicate;
  };
  return false
};

export function resolves(a: ShortAnswer | Proposition, q: Question): boolean {
  if (typeof a === "object" && q.predicate === a.predicate) {
    return true;
  }
  return false;
}

export function combine(
  domain: Domain,
  q: Question,
  a: ShortAnswer | Proposition
): Proposition {
  /*if (
    typeof a === "string" &&
    domain.predicates[q.predicate] === domain.individuals[a]
  ) {
    return { predicate: q.predicate, argument: a };
  }
  if (typeof a === "object" && q.predicate === a.predicate) {
    return a;
  }
  throw new Error("Combine failed."); */
    if (typeof a === "string") {
    const sort = domain.predicates[q.predicate];

    if (
      domain.openSorts.includes(sort) ||
      domain.individuals[a] === sort
    ) {
      return {
        predicate: q.predicate,
        argument: a,
      };
    }
  }

    if (typeof a === "object" && q.predicate === a.predicate) {
      return a;
    }

    throw new Error("Combine failed.");
}
