export type HeirsInfo = {
  spouse: boolean;
  children: number;
  ascendants: boolean;
  siblings: boolean;
  hasMinorHeir: boolean;
};
export type WillInfo = { type: "none" | "holograph" | "notarial"; keptAtMoJ?: boolean };
export type EstateInfo = { hasRealEstate: boolean; hasUnlistedShares: boolean; hasOverseas: boolean };
export type Deadlines = { deathDateISO: string };
export type RuleResult = { id: string; severity: "error" | "warn" | "info"; tip: string; sourceName?: string; href?: string };

export const SOURCES = {
  tax10m: { name: "国税庁：相続税の申告と納税", href: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/sozoku/4205.htm" },
  renun3m: { name: "裁判所：承認・放棄の熟慮期間", href: "https://www.courts.go.jp/saiban/syurui/syurui_kazi/kazi_06_25/index.html" },
  reg3y: { name: "法務省：相続登記の申請義務化Q&A", href: "https://www.moj.go.jp/MINJI/minji05_00565.html" },
  notary: { name: "日本公証人連合会：遺言Q&A", href: "https://www.koshonin.gr.jp/notary/ow02" },
  holographKeep: { name: "法務省：自筆証書遺言書保管制度", href: "https://www.moj.go.jp/MINJI/minji03_00051.html" },
  minorAgent: { name: "裁判所：特別代理人選任（利益相反）", href: "https://www.courts.go.jp/saiban/syurui/syurui_kazi/kazi_06_11/index.html" },
  allSign: { name: "国税庁：提出書類（協議書＋印鑑証明）", href: "https://www.nta.go.jp/publication/pamph/sozoku/shikata-sozoku2023/pdf/E11.pdf" },
  cc898: { name: "民法898（共同相続の効力）", href: "https://tek-law.jp/civil-code/inheritance/effect-of-inheritance/general-provisions/article-898/" },
};

export function runLegalChecks(
  heirs: HeirsInfo, will: WillInfo, estate: EstateInfo, d: Deadlines, ui: { sumPercent: number }
): RuleResult[] {
  const out: RuleResult[] = [];

  // 遺留分リスク（総体1/2 or 1/3の概念に留意） → 過度な偏りの注意喚起
  if (ui.sumPercent === 100 && (heirs.spouse || heirs.children || heirs.ascendants)) {
    out.push({ id: "iryubun", severity: "warn", tip: "遺留分の侵害リスクに留意（相手方が請求すると金銭請求に）", href: SOURCES.cc898.href, sourceName: "民法の相続総則" });
  }

  // 自筆証書遺言の保管制度未利用
  if (will.type === "holograph" && !will.keptAtMoJ) {
    out.push({ id: "holograph", severity: "info", tip: "自筆証書は方式不備の無効リスク・保管制度の活用を推奨", ...SOURCES.holographKeep });
  }

  // 公正証書遺言の検認不要メリット
  if (will.type === "notarial") {
    out.push({ id: "notarial", severity: "info", tip: "公正証書遺言は家庭裁判所の検認手続が不要", ...SOURCES.notary });
  }

  // 未成年×利益相反＝特別代理人
  if (heirs.hasMinorHeir && (heirs.spouse || heirs.children)) {
    out.push({ id: "minor", severity: "error", tip: "未成年相続人がいる場合は遺産分割協議に特別代理人が必要の可能性", ...SOURCES.minorAgent });
  }

  // 期限：10か月／3か月／3年
  const death = d.deathDateISO ? new Date(d.deathDateISO) : null;
  const now = new Date();
  if (death) {
    const plusMonths = (dt: Date, m: number) => new Date(dt.getFullYear(), dt.getMonth() + m, dt.getDate());
    if (now > new Date(plusMonths(death, 10).getTime() - 1000 * 60 * 60 * 24 * 30))
      out.push({ id: "tax10m", severity: "warn", tip: "相続税の申告・納付（10か月）に注意", ...SOURCES.tax10m });
    if (now > new Date(plusMonths(death, 3).getTime() - 1000 * 60 * 60 * 24 * 7))
      out.push({ id: "renun3m", severity: "warn", tip: "相続放棄（原則3か月：熟慮期間）の期限接近", ...SOURCES.renun3m });
  }

  if (estate.hasRealEstate) {
    out.push({ id: "reg3y", severity: "warn", tip: "不動産の相続登記は『取得を知ってから3年以内』が義務", ...SOURCES.reg3y });
  }

  // 実務書類（協議書＋印鑑証明）
  out.push({ id: "allSign", severity: "info", tip: "遺産分割協議書は相続人全員の署名押印（印鑑証明）を実務で要求", ...SOURCES.allSign });

  // 共有状態の注意喚起
  out.push({ id: "cc898", severity: "info", tip: "遺産分割完了まで共同相続＝共有状態。早期分割を推奨", ...SOURCES.cc898 });

  return out;
}
