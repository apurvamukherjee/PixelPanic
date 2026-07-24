// Built-in word packs, seeded into SQLite on boot (see migrate.ts). Custom
// packs (host-submitted) are stored separately and never touch this file.
export const DEFAULT_WORD_PACK_ID = "default";
export const DEFAULT_WORD_PACK_NAME = "Classic Mix";

export const DEFAULT_WORDS: string[] = [
  // Animals
  "elephant", "giraffe", "penguin", "octopus", "kangaroo", "dolphin", "spider",
  "butterfly", "crocodile", "hedgehog", "flamingo", "gorilla", "squirrel",
  "peacock", "jellyfish", "camel", "raccoon", "owl", "bat", "snail",
  // Food
  "pizza", "sushi", "hamburger", "pancake", "watermelon", "popcorn", "donut",
  "spaghetti", "taco", "ice cream", "sandwich", "pretzel", "cupcake", "avocado",
  "pineapple", "cookie", "waffle", "burrito", "noodles", "cheese",
  // Objects
  "umbrella", "guitar", "telescope", "backpack", "candle", "scissors", "anchor",
  "balloon", "camera", "compass", "ladder", "lantern", "magnet", "microscope",
  "parachute", "robot", "rocket", "skateboard", "suitcase", "typewriter",
  // Nature / places
  "volcano", "waterfall", "iceberg", "desert", "rainbow", "lighthouse",
  "tornado", "avalanche", "jungle", "canyon", "island", "glacier", "cave",
  "beehive", "campfire", "meadow", "swamp", "cliff", "oasis", "reef",
  // Actions
  "juggling", "sneezing", "swimming", "yawning", "dancing", "climbing",
  "whistling", "snoring", "skating", "diving", "wrestling", "painting",
  "sculpting", "fishing", "surfing", "boxing", "hiking", "typing", "baking",
  "sleeping",
  // Professions / people
  "astronaut", "firefighter", "wizard", "pirate", "ninja", "detective",
  "chef", "surgeon", "knight", "mermaid", "vampire", "referee", "librarian",
  "beekeeper", "lifeguard", "juggler", "plumber", "sailor", "artist", "clown",
  // Misc / abstract-ish but drawable
  "spaceship", "castle", "treasure chest", "haunted house", "roller coaster",
  "snowman", "scarecrow", "windmill", "hot air balloon", "submarine",
  "igloo", "campsite", "carousel", "drawbridge", "hourglass", "kite",
  "maze", "puppet", "trampoline", "cauldron",
  // Emotions / concepts (still drawable via symbols/expressions)
  "nightmare", "friendship", "gravity", "echo", "silence", "chaos",
  "victory", "curiosity", "loneliness", "courage",
];

const PLACES_WORDS: string[] = [
  "beach", "airport", "library", "hospital", "stadium", "cinema", "supermarket",
  "mountain peak", "desert island", "subway station", "farm", "zoo", "aquarium",
  "amusement park", "graveyard", "prison", "courtroom", "casino", "nightclub",
  "gym", "church", "temple", "pyramid", "eiffel tower", "great wall",
  "statue of liberty", "taj mahal", "colosseum", "stonehenge", "niagara falls",
  "grand canyon", "sahara desert", "north pole", "moon base", "atlantis",
  "times square", "harbor", "pier", "farmhouse", "barn", "greenhouse",
  "observatory", "planetarium", "museum", "art gallery", "opera house",
  "racetrack", "ski resort", "trailer park", "junkyard", "attic", "basement",
  "rooftop", "parking lot", "gas station", "barbershop", "tattoo parlor",
  "police station", "fire station", "post office", "embassy", "space station",
];

const OBJECTS_WORDS: string[] = [
  "toothbrush", "spatula", "stapler", "keyboard", "headphones", "wallet",
  "sunglasses", "flashlight", "hammer", "screwdriver", "wrench", "paperclip",
  "rubber band", "shoelace", "zipper", "button", "pillow", "blanket", "mirror",
  "comb", "toaster", "blender", "vacuum cleaner", "washing machine",
  "refrigerator", "microwave", "remote control", "battery", "extension cord",
  "light bulb", "alarm clock", "calendar", "notebook", "envelope", "stamp",
  "keychain", "padlock", "handcuffs", "helmet", "goggles", "life jacket",
  "fire extinguisher", "first aid kit", "thermometer", "syringe", "bandage",
  "wheelchair", "crutches", "cane", "trophy", "medal", "crown", "throne",
  "shield", "sword", "bow and arrow", "slingshot", "yo-yo", "rubik's cube",
  "chess board", "dice", "playing cards", "piggy bank", "treasure map",
];

const CURSE_WORDS: string[] = [
  "damn", "hell", "ass", "asshole", "badass", "bastard", "bitch", "booty",
  "crap", "dammit", "dick", "dumbass", "fart", "hangover", "horny", "jackass",
  "kickass", "motherfucker", "naked", "pissed off", "poop", "screwed", "shit",
  "shitfaced", "skidmark", "slut", "stoned", "stripper", "tequila shot",
  "tipsy", "twerk", "vomit", "wasted", "weed", "wtf", "booze", "drunk",
  "hangry", "hookup", "one night stand",
];

const SLANG_WORDS: string[] = [
  "yeet", "sus", "bruh", "lowkey", "highkey", "no cap", "rizz", "simp",
  "ghosting", "flex", "salty", "savage", "extra", "vibe check", "main character",
  "mid", "bet", "drip", "gaslighting", "stan", "cringe", "based", "ratio",
  "touch grass", "delulu", "glow up", "side eye", "hits different",
  "big yikes", "it's giving", "understood the assignment", "living rent free",
];

const BRAINIAC_WORDS: string[] = [
  "paradox", "infinity", "entropy", "singularity", "algorithm", "hypothesis",
  "symbiosis", "metaphor", "philosophy", "quantum leap", "recursion",
  "existentialism", "deja vu", "subconscious", "irony", "satire",
  "time travel", "parallel universe", "artificial intelligence", "black hole",
  "butterfly effect", "cognitive dissonance", "placebo effect",
  "chain reaction", "illusion", "zeitgeist", "nostalgia", "serendipity",
  "procrastination", "overthinking",
];

const FUNNY_WORDS: string[] = [
  "awkward silence", "dad joke", "hangry", "facepalm", "photobombing",
  "wardrobe malfunction", "walk of shame", "brain fart", "side hustle",
  "gym rat", "couch potato", "drama queen", "backseat driver",
  "chicken dance", "dad bod", "cringe compilation", "nosy neighbor",
  "midlife crisis", "monday blues", "selfie fail", "epic fail", "cat video",
  "group chat drama", "autocorrect fail", "low battery anxiety",
  "wifi password fail", "awkward hug", "unexpected fart", "existential dread",
];

const CAR_BRAND_WORDS: string[] = [
  "toyota", "honda", "ford", "chevrolet", "tesla", "bmw", "mercedes benz",
  "audi", "volkswagen", "porsche", "ferrari", "lamborghini", "mclaren",
  "bugatti", "nissan", "mazda", "subaru", "hyundai", "kia", "jeep",
  "cadillac", "lexus", "volvo", "jaguar", "land rover", "mini cooper",
  "fiat", "bentley", "rolls royce", "maserati", "aston martin", "renault",
];

const BIKE_BRAND_WORDS: string[] = [
  "harley davidson", "ducati", "kawasaki", "yamaha", "suzuki", "triumph",
  "ktm", "royal enfield", "indian motorcycle", "aprilia", "moto guzzi",
  "husqvarna", "vespa", "bajaj", "hero motocorp", "benelli", "mv agusta",
  "piaggio", "zero motorcycles", "can am",
];

const SPORTS_WORDS: string[] = [
  "football", "basketball", "baseball", "cricket", "tennis", "badminton",
  "volleyball", "rugby", "golf", "hockey", "gymnastics", "archery",
  "fencing", "skateboarding", "rock climbing", "bowling", "table tennis",
  "snowboarding", "skiing", "marathon", "triathlon", "weightlifting",
  "cycling", "sumo wrestling", "curling", "water polo", "pole vault",
  "javelin throw", "figure skating", "rowing",
];

const MOVIE_NIGHT_WORDS: string[] = [
  "plot twist", "cliffhanger", "cameo", "spoiler alert", "binge watching",
  "rom com", "action movie", "horror movie", "reboot", "sequel", "prequel",
  "movie trailer", "red carpet", "blockbuster", "flashback", "montage",
  "soundtrack", "villain", "sidekick", "plot armor", "jump scare",
  "love triangle", "comic relief", "post credit scene", "box office flop",
  "tearjerker", "popcorn movie", "cult classic", "on screen kiss",
  "dramatic pause",
];

const GAMER_MODE_WORDS: string[] = [
  "boss battle", "power up", "respawn", "loot box", "speedrun", "rage quit",
  "pixel art", "joystick", "high score", "game over", "npc", "cutscene",
  "easter egg", "co op", "controller", "arcade", "leaderboard",
  "achievement unlocked", "glitch", "save point", "multiplayer", "level up",
  "health bar", "final boss", "side quest", "virtual reality", "esports",
  "gamer rage", "noob",
];

const MYTHICAL_FANTASY_WORDS: string[] = [
  "dragon", "unicorn", "phoenix", "centaur", "minotaur", "griffin",
  "werewolf", "fairy", "goblin", "troll", "elf", "dwarf", "sphinx", "kraken",
  "yeti", "ghost", "zombie", "genie", "ogre", "gnome", "banshee", "cyclops",
  "chimera", "pegasus", "leprechaun", "medusa", "dragon egg", "magic wand",
  "spell book", "potion",
];

export interface BuiltInWordPack {
  id: string;
  name: string;
  words: string[];
}

// Every entry here gets seeded once (per id) on boot — see
// seedBuiltInWordPacksIfEmpty in migrate.ts. Adding a new pack to this array
// is enough; existing rows for packs already in the DB are left untouched.
export const BUILT_IN_WORD_PACKS: BuiltInWordPack[] = [
  { id: DEFAULT_WORD_PACK_ID, name: DEFAULT_WORD_PACK_NAME, words: DEFAULT_WORDS },
  { id: "places", name: "Places", words: PLACES_WORDS },
  { id: "objects", name: "Everyday Objects", words: OBJECTS_WORDS },
  { id: "curse-words", name: "Curse Words (18+)", words: CURSE_WORDS },
  { id: "slang", name: "Internet Slang", words: SLANG_WORDS },
  { id: "brainiac", name: "Brainiac (High IQ)", words: BRAINIAC_WORDS },
  { id: "funny", name: "Absurd & Funny", words: FUNNY_WORDS },
  { id: "car-brands", name: "Car Brands", words: CAR_BRAND_WORDS },
  { id: "bike-brands", name: "Motorcycle Brands", words: BIKE_BRAND_WORDS },
  { id: "sports", name: "Sports", words: SPORTS_WORDS },
  { id: "movie-night", name: "Movie Night", words: MOVIE_NIGHT_WORDS },
  { id: "gamer-mode", name: "Gamer Mode", words: GAMER_MODE_WORDS },
  { id: "mythical-fantasy", name: "Mythical & Fantasy", words: MYTHICAL_FANTASY_WORDS },
];
