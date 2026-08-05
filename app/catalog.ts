export type CharmKind = "simple" | "hanging" | "linked" | "double";
export type Metal = "Silver" | "Gold" | "Rose Gold";

export type Charm = {
  id: string;
  name: string;
  price: number;
  image: string;
  kind: CharmKind;
  metal: Metal;
  theme: Theme;
  span: 1 | 2;
};

export type Watch = {
  id: string;
  name: string;
  price: number;
  image: string;
  metal: "Silver" | "Gold";
};

export const THEMES = [
  "Friendship",
  "Lucky",
  "Travel",
  "Sports",
  "Zodiac",
  "Family",
  "Animals",
  "Love",
  "Nature",
  "Food & Drink",
  "Music",
  "Birthday",
  "Symbols",
  "Positive",
  "Lifestyle",
] as const;

export type Theme = (typeof THEMES)[number];

const rawCharms: Array<
  [name: string, price: number, kind: CharmKind]
> = [
  ["#BFF Multicolor Silver — € 3.99", 3.99, "simple"],
  ["00:00 on Gold — € 3.99", 3.99, "simple"],
  ["3 Crystals Rose on Gold — € 3.99", 3.99, "simple"],
  ["3 Hugging Cats on Gold — € 3.99", 3.99, "simple"],
  ["3 Leaf Clover on Gold — € 3.99", 3.99, "simple"],
  ["3 Leaf Clover on Silver — € 3.99", 3.99, "simple"],
  ["4-leaf Clover and its Stem, in Gold and White Stones — € 4.99", 4.99, "simple"],
  ["4-leaf Clover and its Stem, in Silver and White Stones — € 4.99", 4.99, "simple"],
  ["7 with 2 Stones on Blue Plate on Gold — € 3.99", 3.99, "simple"],
  ["777 Black on Silver — € 3.99", 3.99, "simple"],
  ["777 Casino on Pink Plate on Silver — € 3.99", 3.99, "simple"],
  ["777 on Black Plate on Gold — € 3.99", 3.99, "simple"],
  ["90's Baby Gold — € 3.99", 3.99, "simple"],
  ["Adventure in the Mountains, on Silver — € 3.99", 3.99, "simple"],
  ["Algeria on Gold — € 3.99", 3.99, "simple"],
  ["Algeria on Silver — € 3.99", 3.99, "simple"],
  ["American Football Ball, Red and Orange, on Silver — € 3.99", 3.99, "simple"],
  ["Anti Social on Gold — € 3.99", 3.99, "simple"],
  ["Anti Social Silver — € 3.99", 3.99, "simple"],
  ["Apple Juice Box on Gold — € 3.99", 3.99, "simple"],
  ["April on Gold — € 3.99", 3.99, "simple"],
  ["April on Silver — € 3.99", 3.99, "simple"],
  ["Aquarius, on Silver — € 3.99", 3.99, "simple"],
  ["Argentina on Gold — € 3.99", 3.99, "simple"],
  ["Argentina on Silver — € 3.99", 3.99, "simple"],
  ["Aries Blue, on Gold — € 3.99", 3.99, "simple"],
  ["Aries Blue, on Silver — € 3.99", 3.99, "simple"],
  ["Aries, on Silver — € 3.99", 3.99, "simple"],
  ["August on Gold — € 3.99", 3.99, "simple"],
  ["August on Silver — € 3.99", 3.99, "simple"],
  ["AUNT, on Silver — € 3.99", 3.99, "simple"],
  ["Australia Flag, on Silver — € 3.99", 3.99, "simple"],
  ["Australia on Gold — € 3.99", 3.99, "simple"],
  ["Austria on Gold — € 3.99", 3.99, "simple"],
  ["Austria on Silver — € 3.99", 3.99, "simple"],
  ["BAD BUNNY — € 3.99", 3.99, "simple"],
  ["Bad Bunny Gold — € 3.99", 3.99, "simple"],
  ["Bag of Dollars, Green and Gold — € 3.99", 3.99, "simple"],
  ["Baseball Silver — € 3.99", 3.99, "simple"],
  ["Basketball — € 3.99", 3.99, "simple"],
  ["Be Mine on White Plate on Gold — € 3.99", 3.99, "simple"],
  ["Be True To You — € 3.99", 3.99, "simple"],
  ["Bears, Green and Purple — € 3.99", 3.99, "simple"],
  ["Bears, Turquoise and Pink — € 3.99", 3.99, "simple"],
  ["Bee with Stones on Gold — € 3.99", 3.99, "simple"],
  ["Bee, on Silver — € 3.99", 3.99, "simple"],
  ["Belgium Flag, on Silver — € 8.99", 8.99, "simple"],
  ["Belgium on Gold — € 8.99", 8.99, "simple"],
  ["Believe in Black with Butterflies — € 3.99", 3.99, "simple"],
  ["Believe Unicorn Silver — € 4.99", 4.99, "simple"],
  ["Berlin — € 3.99", 3.99, "simple"],
  ["Best — € 3.99", 3.99, "simple"],
  ["Best Friend, on Silver — € 3.99", 3.99, "simple"],
  ["Best Friends, In Black with a Pink Paw — € 3.99", 3.99, "simple"],
  ["BFF, on Silver — € 3.99", 3.99, "simple"],
  ["Big Sis with Pink Hearts on Gold — € 3.99", 3.99, "simple"],
  ["Bird with Stones on Silver — € 3.99", 3.99, "simple"],
  ["Black & White Cat Laying Down on Gold — € 3.99", 3.99, "simple"],
  ["Black & White Checkers with Pink Flowers on Silver — € 3.99", 3.99, "simple"],
  ["Black Acoustic Guitar on Gold — € 3.99", 3.99, "simple"],
  ["3 Leaf Clover with Stones Hanging on Gold — € 5.99", 5.99, "hanging"],
  ["5 Leaves on Silver — € 4.99", 4.99, "hanging"],
  ["Aquarius Sign Hanging on Gold — € 13.99", 13.99, "hanging"],
  ["Aquarius Sign, on Silver — € 13.99", 13.99, "hanging"],
  ["Pink Heart, Double Linked Charms, on Silver — € 5.99", 5.99, "linked"],
  ["Full Heart on Double Charms Hanging on Silver — € 3.99", 3.99, "linked"],
  ["Grey Heart, Double Linked Charms on Silver — € 5.99", 5.99, "linked"],
  ["Multicolor Heart, Double Linked Charms, on Silver — € 5.99", 5.99, "linked"],
  ["Baby, on Silver — € 13.99", 13.99, "double"],
  ["Best Friends, Double, on Gold — € 13.99", 13.99, "double"],
  ["Big City — € 13.99", 13.99, "double"],
  ["Dream Infinity Engraved Silver Charm — € 13.99", 13.99, "double"],
  ["Faith, Hope, Love — € 13.99", 13.99, "double"],
  ["Family, on Silver — € 13.99", 13.99, "double"],
];

function cleanName(name: string) {
  return name.replace(/\s*[—–]\s*€\s*\d+(?:\.\d+)?\s*$/u, "").trim();
}

function getMetal(name: string): Metal {
  const value = name.toLowerCase();
  if (value.includes("rose gold")) return "Rose Gold";
  if (value.includes("on silver") || value.endsWith("silver") || value.includes("silver charm")) {
    return "Silver";
  }
  return value.includes("gold") ? "Gold" : "Silver";
}

function getTheme(name: string): Theme {
  const value = name.toLowerCase();
  if (/aquarius|aries|zodiac/.test(value)) return "Zodiac";
  if (/algeria|argentina|australia|austria|belgium|berlin|big city|mountain|flag/.test(value)) return "Travel";
  if (/football|baseball|basketball/.test(value)) return "Sports";
  if (/bff|best friend|best$/.test(value)) return "Friendship";
  if (/clover|777|casino/.test(value)) return "Lucky";
  if (/aunt|sis|baby|family|mommy/.test(value)) return "Family";
  if (/cat|bear|bee|bird|bunny|paw/.test(value)) return "Animals";
  if (/heart|be mine|love/.test(value)) return "Love";
  if (/leaf|butterfl|flower|unicorn/.test(value)) return "Nature";
  if (/juice|tea|burger|boba/.test(value)) return "Food & Drink";
  if (/guitar|bad bunny/.test(value)) return "Music";
  if (/april|august|90's baby/.test(value)) return "Birthday";
  if (/00:00|crystal|dollar|cross|infinity/.test(value)) return "Symbols";
  if (/anti social|be true|believe|dream|faith|hope/.test(value)) return "Positive";
  return "Lifestyle";
}

export const CHARMS: Charm[] = rawCharms.map(([rawName, price, kind], index) => {
  const name = cleanName(rawName);
  return {
    id: `charm-${String(index + 1).padStart(3, "0")}`,
    name,
    price,
    image: `/catalog/charm-${String(index + 1).padStart(3, "0")}.webp`,
    kind,
    metal: getMetal(name),
    theme: getTheme(name),
    span: kind === "linked" || kind === "double" ? 2 : 1,
  };
});

const watchNames = [
  "Como Watch Silver – Blue Dial Edition",
  "Como Watch Silver – Pink Dial Edition",
  "Como Watch Silver – White Dial Edition",
  "Como Watch Silver – Black Dial Edition",
  "Como Watch Gold – White Dial Edition",
  "Como Watch Gold – Emerald Dial Edition",
];

export const WATCHES: Watch[] = watchNames.map((name, index) => ({
  id: `watch-${String(index + 1).padStart(3, "0")}`,
  name,
  price: name.includes("Gold") ? 129 : 120,
  image: `/catalog/watch-${String(index + 1).padStart(3, "0")}.webp`,
  metal: name.includes("Gold") ? "Gold" : "Silver",
}));

export const BRACELET_COLORS = [
  { id: "silver", label: "Silver", price: 24.99, swatch: "#d9dcdb" },
  { id: "gold", label: "Gold", price: 29.99, swatch: "#d7ab50" },
  { id: "rose", label: "Rose Gold", price: 29.99, swatch: "#c99578" },
  { id: "black", label: "Black", price: 26.99, swatch: "#343435" },
] as const;

export type BraceletColorId = (typeof BRACELET_COLORS)[number]["id"];
