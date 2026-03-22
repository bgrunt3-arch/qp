export type FleaMarketPreset = {
  name: string;
  commissionRate: string;
  transferFee: string;
};

export const FLEA_MARKET_PRESETS: FleaMarketPreset[] = [
  { name: "メルカリ",      commissionRate: "10", transferFee: "200" },
  { name: "ラクマ",        commissionRate: "10", transferFee: "210" },
  { name: "Yahoo!フリマ",  commissionRate: "5",  transferFee: "100" },
];
