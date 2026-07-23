// Built-in Phase 1 word pack — a broad, easy-to-draw mix so quick-match games
// never run dry. Custom packs (host-submitted) are stored separately in SQLite.
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
