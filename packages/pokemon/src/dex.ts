import { Dex } from "@pkmn/dex";
import { Generations } from "@pkmn/data";

const gens = new Generations(Dex);

/** Generation 9 (Scarlet/Violet) dex instance, shared across the package. */
export const gen9 = gens.get(9);
