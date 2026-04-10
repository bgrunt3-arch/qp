export type FleaMarketPreset = {
  name: string;
  commissionRate: string;
};

export const FLEA_MARKET_PRESETS: FleaMarketPreset[] = [
  { name: "メルカリ",      commissionRate: "10" },
  { name: "ラクマ",        commissionRate: "10" },
  { name: "Yahoo!フリマ",  commissionRate: "5"  },
];
