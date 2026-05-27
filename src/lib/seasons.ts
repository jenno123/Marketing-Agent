const seasons: Record<string, string> = {
  january:   "januar — vinterstille, få besøgende, ro på museet",
  february:  "februar — vinter ved at give slip, forberedelser til sæsonen",
  march:     "marts — forår på vej, museet vågner op",
  april:     "april — forår, påske, sæsonstart nærmer sig",
  may:       "maj — sæsonåbning, frisk natur, lyse dage",
  june:      "juni — højsæson, skoleudflugt, lange lyse aftener",
  july:      "juli — højsommer, feriefamilier, fuldt program",
  august:    "august — sensommer, stadig højsæson, begyndende eftersommer",
  september: "september — gylden efterår, roligere, smuk natur",
  october:   "oktober — efterårsferie, høst, sæsonen lakker mod enden",
  november:  "november — sæson slut, museet i dvale",
  december:  "december — jul, eftertanke, forberedelse til næste år",
};

export function getCurrentSeason(): string {
  const month = new Date().toLocaleString("en-US", { month: "long" }).toLowerCase();
  return seasons[month] ?? "";
}
