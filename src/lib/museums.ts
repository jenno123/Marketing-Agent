export type MuseumSlug = "hjerlhede" | "holstebro" | "strandingsmuseum";

export interface Museum {
  slug: MuseumSlug;
  name: string;
  shortName: string;
  description: string;
  knowledgeFile: string;
  supabaseKeys: {
    retningslinjer: string;
    instagramInspiration: string;
    facebookInspiration: string;
  };
  systemPrompt: string;
  billedePrompt: string;
  platforms: string[];
}

export const museums: Museum[] = [
  {
    slug: "hjerlhede",
    name: "Hjerl Hede Frilandsmuseum",
    shortName: "Hjerl Hede",
    description: "Frilandsmuseum med historiske bygninger, håndværk og bondekultur",
    knowledgeFile: "hjerlhede_knowledge.txt",
    supabaseKeys: {
      retningslinjer: "retningslinjer",
      instagramInspiration: "instagram",
      facebookInspiration: "facebook",
    },
    systemPrompt: "Du er social media manager for Hjerl Hede Frilandsmuseum i Midtjylland.",
    billedePrompt:
      "Jeg har vedhæftet et billede. Lad dig inspirere af billedets stemning, lys og atmosfære — men beskriv IKKE billedet direkte. Skriv et opslag der vækker den samme følelse som billedet giver, og trækker på Hjerl Hedes historie og natur.",
    platforms: ["Facebook", "Instagram", "LinkedIn"],
  },
  {
    slug: "holstebro",
    name: "Holstebro Museum",
    shortName: "Holstebro",
    description: "Kulturhistorisk museum med vestjysk historie fra vikingetid til nutid",
    knowledgeFile: "holstebro_knowledge.txt",
    supabaseKeys: {
      retningslinjer: "retningslinjer_holstebro",
      instagramInspiration: "holstebro_instagram",
      facebookInspiration: "holstebro_facebook",
    },
    systemPrompt:
      "Du er social media manager for Holstebro Museum i Vestjylland.\nHolstebro Museum fortæller om den vestjyske historie fra vikingetiden til i dag, med fokus på arkæologi, kulturhistorie og jernindustri.\nMuseet deler bygning med Holstebro Kunstmuseum og er en del af De Kulturhistoriske Museer i Holstebro Kommune.",
    billedePrompt:
      "Jeg har vedhæftet et billede. Lad dig inspirere af billedets stemning, lys og atmosfære — men beskriv IKKE billedet direkte. Skriv et opslag der vækker den samme følelse som billedet giver, og trækker på Holstebro Museums historie og udstillinger.",
    platforms: ["Facebook", "Instagram", "LinkedIn"],
  },
  {
    slug: "strandingsmuseum",
    name: "Strandingsmuseum St. George",
    shortName: "Strandingsmuseum",
    description: "Maritimmuseum om strandinger på Vestkysten og HMS St. George",
    knowledgeFile: "strandingsmuseum_knowledge.txt",
    supabaseKeys: {
      retningslinjer: "retningslinjer_strandingsmuseum",
      instagramInspiration: "stranding_instagram",
      facebookInspiration: "stranding_facebook",
    },
    systemPrompt:
      "Du er social media manager for Strandingsmuseum St. George i Thorsminde ved den jyske vestkyst.\nMuseet fortæller om dramatiske strandinger på Vestkysten, de britiske linjeskibe HMS St. George og HMS Defence der forliste i 1811, og om kystbefolkningens møde med søfolk fra hele verden.\nMuseet er bygget som skibet selv — 59 meter langt med tre etager — og rummer et imponerende tårn med HMS St. Georges originale ror og panoramaudsigt over Vesterhavet.\nDet er en del af De Kulturhistoriske Museer i Holstebro Kommune.",
    billedePrompt:
      "Jeg har vedhæftet et billede. Lad dig inspirere af billedets stemning, lys og atmosfære — men beskriv IKKE billedet direkte. Skriv et opslag der vækker den samme følelse som billedet giver, og trækker på museets fortællinger om havet, strandinger og kystlivet.",
    platforms: ["Facebook", "Instagram", "LinkedIn"],
  },
];

export function getMuseum(slug: string): Museum | undefined {
  return museums.find((m) => m.slug === slug);
}
