import type { TradeSiteVersion } from './trade-location.ts';

export interface BookmarksTradeLocation {
  version: TradeSiteVersion;
  type: string;
  slug: string;
}

export interface PartialBookmarksTradeLocation {
  version: TradeSiteVersion;
  type: string | null;
  slug: string | null;
}

export interface BookmarksTradeStruct {
  id?: string;
  title: string;
  location: BookmarksTradeLocation;
  completedAt: string | null;
}

export interface BookmarksFolderStruct {
  id?: string;
  title: string;
  version: TradeSiteVersion;
  icon: BookmarksFolderIcon | null;
  archivedAt: string | null;
}

export type BookmarksFolderIcon =
  | BookmarksFolderPoE1AscendancyIcon
  | BookmarksFolderPoE1ItemIcon
  | BookmarksFolderPoE2AscendancyIcon
  | BookmarksFolderPoE2ItemIcon
  // Legacy: Raider was replaced by Warden; kept so old saved folders type-check, rendered as Warden
  | 'raider';

export enum BookmarksFolderAscendancyDuelistIcon {
  SLAYER = 'slayer',
  GLADIATOR = 'gladiator',
  CHAMPION = 'champion',
}

export enum BookmarksFolderAscendancyShadowIcon {
  ASSASSIN = 'assassin',
  SABOTEUR = 'saboteur',
  TRICKSTER = 'trickster',
}

export enum BookmarksFolderAscendancyMarauderIcon {
  JUGGERNAUT = 'juggernaut',
  BERSERKER = 'berserker',
  CHIEFTAIN = 'chieftain',
}

export enum BookmarksFolderAscendancyWitchIcon {
  NECROMANCER = 'necromancer',
  ELEMENTALIST = 'elementalist',
  OCCULTIST = 'occultist',
}

export enum BookmarksFolderAscendancyRangerIcon {
  DEADEYE = 'deadeye',
  PATHFINDER = 'pathfinder',
  WARDEN = 'warden',
}

export enum BookmarksFolderAscendancyTemplarIcon {
  GUARDIAN = 'guardian',
  HIEROPHANT = 'hierophant',
  INQUISITOR = 'inquisitor',
}

export enum BookmarksFolderAscendancyScionIcon {
  ASCENDANT = 'ascendant',
  RELIQUARIAN = 'reliquarian',
  LUMINARY = 'luminary',
}

export enum BookmarksFolderAscendancyPoE2WarriorIcon {
  TITAN = 'poe2-titan',
  WARBRINGER = 'poe2-warbringer',
  SMITH_OF_KITAVA = 'poe2-smith-of-kitava',
}

export enum BookmarksFolderAscendancyPoE2WitchIcon {
  INFERNALIST = 'poe2-infernalist',
  BLOOD_MAGE = 'poe2-blood-mage',
  LICH = 'poe2-lich',
  ABYSSAL_LICH = 'poe2-abyssal-lich',
}

export enum BookmarksFolderAscendancyPoE2RangerIcon {
  DEADEYE = 'poe2-deadeye',
  PATHFINDER = 'poe2-pathfinder',
}

export enum BookmarksFolderAscendancyPoE2HuntressIcon {
  AMAZON = 'poe2-amazon',
  SPIRIT_WALKER = 'poe2-spirit-walker',
  RITUALIST = 'poe2-ritualist',
}

export enum BookmarksFolderAscendancyPoE2SorceressIcon {
  CHRONOMANCER = 'poe2-chronomancer',
  STORMWEAVER = 'poe2-stormweaver',
  DISCIPLE_OF_VARASHTA = 'poe2-disciple-of-varashta',
}

export enum BookmarksFolderAscendancyPoE2MercenaryIcon {
  TACTICIAN = 'poe2-tactician',
  WITCH_HUNTER = 'poe2-witch-hunter',
  GEMLING_LEGIONNAIRE = 'poe2-gemling-legionnaire',
}

export enum BookmarksFolderAscendancyPoE2MonkIcon {
  MARTIAL_ARTIST = 'poe2-martial-artist',
  INVOKER = 'poe2-invoker',
  ACOLYTE_OF_CHAYULA = 'poe2-acolyte-of-chayula',
}

export enum BookmarksFolderAscendancyPoE2DruidIcon {
  ORACLE = 'poe2-oracle',
  SHAMAN = 'poe2-shaman',
}

export type BookmarksFolderPoE1AscendancyIcon =
  | BookmarksFolderAscendancyDuelistIcon
  | BookmarksFolderAscendancyShadowIcon
  | BookmarksFolderAscendancyMarauderIcon
  | BookmarksFolderAscendancyWitchIcon
  | BookmarksFolderAscendancyRangerIcon
  | BookmarksFolderAscendancyTemplarIcon
  | BookmarksFolderAscendancyScionIcon;

export type BookmarksFolderPoE2AscendancyIcon =
  | BookmarksFolderAscendancyPoE2WarriorIcon
  | BookmarksFolderAscendancyPoE2WitchIcon
  | BookmarksFolderAscendancyPoE2RangerIcon
  | BookmarksFolderAscendancyPoE2HuntressIcon
  | BookmarksFolderAscendancyPoE2SorceressIcon
  | BookmarksFolderAscendancyPoE2MercenaryIcon
  | BookmarksFolderAscendancyPoE2MonkIcon
  | BookmarksFolderAscendancyPoE2DruidIcon;

export enum BookmarksFolderPoE1ItemIcon {
  ALCHEMY = 'alchemy',
  CHAOS = 'chaos',
  EXALT = 'exalt',
  DIVINE = 'divine',
  MIRROR = 'mirror',
  CARD = 'card',
  ESSENCE = 'essence',
  FOSSIL = 'fossil',
  MAP = 'map',
  SCARAB = 'scarab',
}

export enum BookmarksFolderPoE2ItemIcon {
  ALCHEMY = 'poe2-alchemy',
  ANNUL = 'poe2-annul',
  ARTIFICER = 'poe2-artificer',
  AUGMENT = 'poe2-augment',
  CHANCE = 'poe2-chance',
  CHAOS = 'poe2-chaos',
  DIVINE = 'poe2-divine',
  ESSENCE = 'poe2-essence',
  EXALT = 'poe2-exalt',
  GEMCUTTER = 'poe2-gemcutter',
  GLASSBLOWER = 'poe2-glassblower',
  MIRROR = 'poe2-mirror',
  REGAL = 'poe2-regal',
  RUNE = 'poe2-rune',
  TRANSMUTE = 'poe2-transmute',
  VAAL = 'poe2-vaal',
  WAYSTONE = 'poe2-waystone',
  WISDOM = 'poe2-wisdom',
}

// PoE 2 ascendancy icons by class, as the icon picker shows them (images: dat-mcp's `ascendancy-icons` script)
export const poe2AscendancyIconGroups: BookmarksFolderPoE2AscendancyIcon[][] = [
  Object.values(BookmarksFolderAscendancyPoE2WarriorIcon),
  Object.values(BookmarksFolderAscendancyPoE2WitchIcon),
  Object.values(BookmarksFolderAscendancyPoE2RangerIcon),
  Object.values(BookmarksFolderAscendancyPoE2HuntressIcon),
  Object.values(BookmarksFolderAscendancyPoE2SorceressIcon),
  Object.values(BookmarksFolderAscendancyPoE2MercenaryIcon),
  Object.values(BookmarksFolderAscendancyPoE2MonkIcon),
  Object.values(BookmarksFolderAscendancyPoE2DruidIcon),
];

// Set of all item icons (PoE1 + PoE2) for quick classification
export const bookmarkFolderItemIcons = new Set<string>([
  ...Object.values(BookmarksFolderPoE1ItemIcon),
  ...Object.values(BookmarksFolderPoE2ItemIcon),
]);
