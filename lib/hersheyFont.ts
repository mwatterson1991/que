/**
 * Hershey Script — single-stroke (engraving) letterforms.
 * ------------------------------------------------------
 * WHY this and not a normal font: a normal glyph is a filled OUTLINE, so
 * animating its stroke traces the *edge* of the letter — it looks like
 * inflating a balloon, not like writing. These are skeleton letterforms: the
 * path a pen actually travels, in the order a hand would travel it. That is
 * what makes the draw-on read as handwriting.
 *
 * SOURCE: the "scripts" (Script 1-stroke) face of the Hershey Fonts, taken
 * verbatim from the canonical JHF distribution
 * (https://github.com/kamalmostafa/hershey-fonts, itself from
 * http://emergent.unpythonic.net/software/hershey). Printable ASCII 32..126,
 * all 96 glyphs, unmodified — only the leading glyph-number and vertex-count
 * columns were stripped, since they are redundant here.
 *
 * LICENCE / REQUIRED ACKNOWLEDGEMENT (the Hershey "USE RESTRICTION" — the data
 * may be used by anyone for any purpose, commercial or otherwise, and may be
 * converted into any other format except the U.S. NTIS one, provided these
 * acknowledgements travel with it):
 *
 *   - The Hershey Fonts were originally created by Dr. A. V. Hershey while
 *     working at the U. S. National Bureau of Standards.
 *   - The format of the Font data in this distribution was originally created
 *     by James Hurt, Cognition, Inc., 900 Technology Park Drive,
 *     Billerica, MA 01821.
 *
 * ENCODING: each entry is one glyph. Every character is one coordinate, taken
 * relative to 'R' (i.e. charCode - 82). The first pair is the glyph's left and
 * right side bearing (their difference is the advance width); the rest are
 * vertices, with the pair " R" meaning "lift the pen". Y grows DOWNWARD.
 */

// Metrics of this face, measured from the data (in Hershey units).
const BASELINE = 9; // y of the baseline
export const HERSHEY_ASCENT = 21; // baseline to the top of caps and ascenders
export const HERSHEY_DESCENT = 12; // baseline to the bottom of descenders

const FIRST_CHAR = 32; // the table starts at space

// prettier-ignore
const GLYPH_DATA: readonly string[] = [
  "JZ",
  "MXUFTGRS RUGRS RUFVGRS RPYOZP[QZPY",
  "I[PFNM RQFNM RYFWM RZFWM",
  "H]SBLb RYBRb RLOZO RKUYU",
  "H]TBL_ RYBQ_ RZJYKZL[K[JZHYGVFRFOGMIMKNMONVRXT RMKOMVQWRXTXWWYVZS[O[LZKYJWJVKULVKW",
  "F^[FI[ RNFPHPJOLMMKMIKIIJGLFNFPGSHVHYG[F RWTUUTWTYV[X[ZZ[X[VYTWT",
  "E_\\N[O\\P]O]N\\M[MYNWPRXPZN[K[HZGXGVHTISKRPPROTMUKUITGRFPGOIOLPRQUSXUZW[Y[ZYZX RK[IZHXHVITJSPP ROLPQQTSWUYWZYZZY",
  "MXUHTGUFVGVHUJSL",
  "KZZBVESHQKOONTNXO]P`Qb RVESIQMPPOUOZP_Qb",
  "JYSBTDUGVLVPUUSYQ\\N_Jb RSBTEUJUOTTSWQ[N_",
  "J[TFTR ROIYO RYIOO",
  "E_RIR[ RIR[R",
  "MXP[OZPYQZQ[P]N_",
  "E_IR[R",
  "MWRYQZR[SZRY",
  "G]_BEb",
  "H]TFQGOIMLLOKSKVLYMZO[Q[TZVXXUYRZNZKYHXGVFTF RTFRGPINLMOLSLVMYO[ RQ[SZUXWUXRYNYKXHVF",
  "H]TJO[ RVFP[ RVFSIPKNL RUIQKNL",
  "H]OJPKOLNKNJOHPGSFVFYGZIZKYMWOTQPSMUKWI[ RVFXGYIYKXMVOPS RJYKXMXRZUZWYXW RMXR[U[WZXW",
  "H]OJPKOLNKNJOHPGSFVFYGZIZKYMVOSP RVFXGYIYKXMVO RQPSPVQWRXTXWWYVZS[O[LZKYJWJVKULVKW RSPUQVRWTWWVYUZS[",
  "H]XGR[ RYFS[ RYFJUZU",
  "H]QFLP RQF[F RQGVG[F RLPMOPNSNVOWPXRXUWXUZR[O[LZKYJWJVKULVKW RSNUOVPWRWUVXTZR[",
  "H]YIXJYKZJZIYGWFTFQGOIMLLOKSKWLYMZO[R[UZWXXVXSWQVPTOQOOPMRLT RTFRGPINLMOLSLXMZ RR[TZVXWVWRVP",
  "H]NFLL R[FZIXLSRQUPWO[ RXLRRPUOWN[ RMIPFRFWI RNHPGRGWIYIZH[F",
  "H]SFPGOHNJNMOOQPTPXOYNZLZIYGVFSF RSFQGPHOJOMPOQP RTPWOXNYLYIXGVF RQPMQKSJUJXKZN[R[VZWYXWXTWRVQTP RQPNQLSKUKXLZN[ RR[UZVYWWWSVQ",
  "H]YMXOVQTRQROQNPMNMKNIPGSFVFXGYHZJZNYRXUVXTZQ[N[LZKXKWLVMWLX ROQNONKOIQGSF RXGYIYNXRWUUXSZQ[",
  "MXSMRNSOTNSM RPYOZP[QZ",
  "MXSMRNSOTNSM RP[OZPYQZQ[P]N_",
  "F^ZIJRZ[",
  "E_IO[O RIU[U",
  "F^JIZRJ[",
  "H]OJPKOLNKNJOHPGSFWFZG[I[KZMYNSPQQQSRTTT RWFYGZIZKYMXNVO RPYOZP[QZPY",
  "E`WNVLTKQKOLNMMPMSNUPVSVUUVS RQKOMNPNSOUPV RWKVSVUXVZV\\T]Q]O\\L[JYHWGTFQFNGLHJJILHOHRIUJWLYNZQ[T[WZYYZX RXKWSWUXV",
  "G[G[IZLWOSSLVFV[UXSUQSNQLQKRKTLVNXQZT[Y[",
  "F]SHTITLSPRSQUOXMZK[J[IZIWJRKOLMNJPHRGUFXFZG[I[KZMYNWOTP RSPTPWQXRYTYWXYWZU[R[PZOX",
  "H\\TLTMUNWNYMZKZIYGWFTFQGOIMLLNKRKVLYMZO[Q[TZVXWV",
  "G^TFRGQIPMOSNVMXKZI[G[FZFXGWIWKXMZP[S[VZXXZT[O[KZHYGWFTFRHRJSMUPWRZT\\U",
  "H\\VJVKWLYLZKZIYGVFRFOGNINLONPOSPPPMQLRKTKWLYMZP[S[VZXXYV",
  "H\\RLPLNKMINGQFTFXG[G]F RXGVNTTRXPZN[L[JZIXIVJULUNV RQPZP",
  "G^G[IZMVPQQNRJRGQFPFOGNINLONQOUOXNYMZKZQYVXXVZS[O[LZJXIVIT",
  "F^MMKLJJJIKGMFNFPGQIQKPONULYJ[H[GZGX RMRVOXN[L]J^H^G]F\\FZHXLVRUWUZV[W[YZZY\\V",
  "IZWVUTSQROQLQIRGSFUFVGWIWLVQTVSXQZO[M[KZJXJVKUMUOV",
  "JYT^R[PVOPOJPGRFTFUGVJVMURR[PaOdNfLgKfKdLaN^P\\SZWX",
  "F^MMKLJJJIKGMFNFPGQIQKPONULYJ[H[GZGX R^I^G]F\\FZGXIVLTNROPO RROSQSXTZU[V[XZYY[V",
  "I\\MRORSQVOXMYKYHXFVFUGTISNRSQVPXNZL[J[IZIXJWLWNXQZT[V[YZ[X",
  "@aEMCLBJBICGEFFFHGIIIKHPGTE[ RGTJLLHMGOFPFRGSISKRPQTO[ RQTTLVHWGYFZF\\G]I]K\\PZWZZ[[\\[^Z_YaV",
  "E]JMHLGJGIHGJFKFMGNINKMPLTJ[ RLTOLQHRGTFVFXGYIYKXPVWVZW[X[ZZ[Y]V",
  "H]TFQGOIMLLNKRKVLYMZO[Q[TZVXXUYSZOZKYHXGVFTFRHRKSNUQWSZU\\V",
  "F_SHTITLSPRSQUOXMZK[J[IZIWJRKOLMNJPHRGUFZF\\G]H^J^M]O\\PZQWQUPTO",
  "H^ULTNSOQPOPNNNLOIQGTFWFYGZIZMYPWSSWPYNZK[I[HZHXIWKWMXPZS[V[YZ[X",
  "F_SHTITLSPRSQUOXMZK[J[IZIWJRKOLMNJPHRGUFYF[G\\H]J]M\\O[PYQVQSPTQUSUXVZX[ZZ[Y]V",
  "H\\H[JZLXOTQQSMTJTGSFRFQGPIPKQMSOVQXSYUYWXYWZT[P[MZKXJVJT",
  "H[RLPLNKMINGQFTFXG[G]F RXGVNTTRXPZN[L[JZIXIVJULUNV",
  "E]JMHLGJGIHGJFKFMGNINKMOLRKVKXLZN[P[RZSYUUXMZF RXMWQVWVZW[X[ZZ[Y]V",
  "F]KMILHJHIIGKFLFNGOIOKNOMRLVLYM[O[QZTWVTXPYMZIZGYFXFWGVIVKWNYP[Q",
  "C_HMFLEJEIFGHFIFKGLILLK[ RUFK[ RUFS[ RaF_G\\JYNVTS[",
  "F^NLLLKKKILGNFPFRGSISLQUQXRZT[V[XZYXYVXUVU R]I]G\\FZFXGVITLPUNXLZJ[H[GZGX",
  "F]KMILHJHIIGKFLFNGOIOKNOMRLVLXMZN[P[RZTXVUWSYM R[FYMVWT]RbPfNgMfMdNaP^S[VY[V",
  "H]ULTNSOQPOPNNNLOIQGTFWFYGZIZMYPWTTWPZN[K[JZJXKWNWPXQYR[R^QaPcNfLgKfKdLaN^Q[TYZV",
  "KYOBOb RPBPb ROBVB RObVb",
  "KYKFY^",
  "KYTBTb RUBUb RNBUB RNbUb",
  "JZPLRITL RMORJWO RRJR[",
  "JZJ]Z]",
  "MXVFTHSJSKTLUKTJ",
  "L\\UUTSRRPRNSMTLVLXMZO[Q[SZTXVRUWUZV[W[YZZY\\V",
  "M[MVOSRNSLTITGSFQGPIOMNTNZO[P[RZTXUUURVVWWYW[V",
  "MXTTTSSRQROSNTMVMXNZP[S[VYXV",
  "L\\UUTSRRPRNSMTLVLXMZO[Q[SZTXZF RVRUWUZV[W[YZZY\\V",
  "NXOYQXRWSUSSRRQROSNUNXOZQ[S[UZVYXV",
  "OWOVSQUNVLWIWGVFTGSIQQNZKaJdJfKgMfNcOZP[R[TZUYWV",
  "L[UUTSRRPRNSMTLVLXMZO[Q[SZTY RVRTYPdOfMgLfLdMaP^S\\U[XY[V",
  "M\\MVOSRNSLTITGSFQGPIOMNSM[ RM[NXOVQSSRURVSVUUXUZV[W[YZZY\\V",
  "PWSMSNTNTMSM RPVRRPXPZQ[R[TZUYWV",
  "PWSMSNTNTMSM RPVRRLdKfIgHfHdIaL^O\\Q[TYWV",
  "M[MVOSRNSLTITGSFQGPIOMNSM[ RM[NXOVQSSRURVSVUTVQV RQVSWTZU[V[XZYY[V",
  "OWOVQSTNULVIVGUFSGRIQMPTPZQ[R[TZUYWV",
  "E^EVGSIRJSJTIXH[ RIXJVLSNRPRQSQTPXO[ RPXQVSSURWRXSXUWXWZX[Y[[Z\\Y^V",
  "J\\JVLSNROSOTNXM[ RNXOVQSSRURVSVUUXUZV[W[YZZY\\V",
  "LZRRPRNSMTLVLXMZO[Q[SZTYUWUUTSRRQSQURWTXWXYWZV",
  "KZKVMSNQMUGg RMUNSPRRRTSUUUWTYSZQ[ RMZO[R[UZWYZV",
  "L[UUTSRRPRNSMTLVLXMZO[Q[SZ RVRUUSZPaOdOfPgRfScS\\U[XY[V",
  "MZMVOSPQPSSSTTTVSYSZT[U[WZXYZV",
  "NYNVPSQQQSSVTXTZR[ RNZP[T[VZWYYV",
  "OXOVQSSO RVFPXPZQ[S[UZVYXV RPNWN",
  "L[LVNRLXLZM[O[QZSXUU RVRTXTZU[V[XZYY[V",
  "L[LVNRMWMZN[O[RZTXUUUR RURVVWWYW[V",
  "I^LRJTIWIYJ[L[NZPX RRRPXPZQ[S[UZWXXUXR RXRYVZW\\W^V",
  "JZJVLSNRPRQSQZR[U[XYZV RWSVRTRSSOZN[L[KZ",
  "L[LVNRLXLZM[O[QZSXUU RVRPdOfMgLfLdMaP^S\\U[XY[V",
  "LZLVNSPRRRTTTVSXQZN[P\\Q^QaPdOfMgLfLdMaP^S\\WYZV",
  "KYTBRCQDPFPHQJRKSMSOQQ RRCQEQGRISJTLTNSPORSTTVTXSZR[Q]Q_Ra RQSSUSWRYQZP\\P^Q`RaTb",
  "NVRBRb",
  "KYPBRCSDTFTHSJRKQMQOSQ RRCSESGRIQJPLPNQPURQTPVPXQZR[S]S_Ra RSSQUQWRYSZT\\T^S`RaPb",
  "F^IUISJPLONOPPTSVTXTZS[Q RISJQLPNPPQTTVUXUZT[Q[O",
  "KYQFOGNINKOMQNSNUMVKVIUGSFQF",
];

// ─── Decoding ────────────────────────────────────────────
type RawGlyph = {
  /** Polylines in Hershey units, x already shifted so the pen starts at 0. */
  strokes: readonly (readonly [number, number][])[];
  /** Advance width in Hershey units. */
  advance: number;
};

const rawCache = new Map<number, RawGlyph | null>();

function decode(code: number): RawGlyph | null {
  if (rawCache.has(code)) return rawCache.get(code) ?? null;

  const body = GLYPH_DATA[code - FIRST_CHAR];
  if (body === undefined || body.length < 2) {
    rawCache.set(code, null);
    return null;
  }

  const left = body.charCodeAt(0) - 82;
  const right = body.charCodeAt(1) - 82;

  const strokes: [number, number][][] = [];
  let current: [number, number][] = [];
  for (let i = 2; i + 1 < body.length; i += 2) {
    // " R" is the pen-up marker, not a coordinate.
    if (body[i] === " " && body[i + 1] === "R") {
      if (current.length > 1) strokes.push(current);
      current = [];
      continue;
    }
    // Shift x by the left bearing so every glyph starts its own box at 0.
    current.push([body.charCodeAt(i) - 82 - left, body.charCodeAt(i + 1) - 82]);
  }
  if (current.length > 1) strokes.push(current);

  const glyph: RawGlyph = { strokes, advance: right - left };
  rawCache.set(code, glyph);
  return glyph;
}

// ─── Layout ──────────────────────────────────────────────
export type HandwritingStroke = {
  /** SVG path data for one continuous pen-down movement. */
  d: string;
  /** Exact length in px, summed from the polyline — no getTotalLength needed. */
  length: number;
};

export type HandwritingGlyph = {
  char: string;
  /** Index of this character in the source string. Stable animation key. */
  index: number;
  /** Pen-start x, in px, absolute within the laid-out block. */
  x: number;
  /** Baseline y of the line this glyph sits on, in px. */
  baselineY: number;
  advance: number;
  strokes: HandwritingStroke[];
  /** Sum of every stroke length — how far the pen travels to write it. */
  totalLength: number;
};

export type HandwritingLayout = {
  /** One entry per character of the input, including spaces and unknowns, so
   *  indices map 1:1 to the string and a caret offset can be looked up. */
  glyphs: HandwritingGlyph[];
  lineHeight: number;
  /** Baseline y of the first line — where a caret sits when there is no text. */
  firstBaseline: number;
  height: number;
  lineCount: number;
};

export type LayoutOptions = {
  /** Ascender height in px — the visual size of a capital letter. */
  fontSize: number;
  /** Wrap width in px. */
  maxWidth: number;
  /** Extra forward slant, as x-shift per px above the baseline. */
  slant?: number;
  /** Extra space between letters, in px. Negative tightens the script up. */
  tracking?: number;
};

const SPACE_UNITS = 10; // the face's own space is 16 units — far too airy
const LINE_GAP = 0.42; // of fontSize, on top of ascent + descent

export function layoutHandwriting(
  text: string,
  { fontSize, maxWidth, slant = 0.14, tracking = -1 }: LayoutOptions
): HandwritingLayout {
  const scale = fontSize / HERSHEY_ASCENT;
  const lineHeight = (HERSHEY_ASCENT + HERSHEY_DESCENT) * scale + fontSize * LINE_GAP;
  const firstBaseline = HERSHEY_ASCENT * scale;
  const spaceAdvance = SPACE_UNITS * scale;
  const width = Math.max(maxWidth, fontSize); // never wrap into nothing

  // Advance width of each character, needed up front so a word can be measured
  // before we decide whether it fits on the current line.
  const advances: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const raw = ch === " " ? null : decode(ch.charCodeAt(0));
    advances.push(
      ch === "\n" ? 0 : raw ? raw.advance * scale + tracking : spaceAdvance
    );
  }

  const glyphs: HandwritingGlyph[] = [];
  let line = 0;
  let x = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === "\n") {
      glyphs.push(blank(ch, i, x, firstBaseline + line * lineHeight));
      line++;
      x = 0;
      continue;
    }

    if (ch === " ") {
      // A space never starts a line — it hangs off the end of the one above.
      glyphs.push(blank(ch, i, x, firstBaseline + line * lineHeight));
      x += advances[i];
      continue;
    }

    // Word wrap: look ahead to the end of this word and break before it if the
    // whole word would overflow. Falls back to a hard break for a single word
    // longer than the line.
    if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
      let wordWidth = 0;
      for (let j = i; j < text.length && text[j] !== " " && text[j] !== "\n"; j++) {
        wordWidth += advances[j];
      }
      if (x > 0 && x + wordWidth > width) {
        line++;
        x = 0;
      }
    } else if (x > 0 && x + advances[i] > width) {
      line++;
      x = 0;
    }

    const baselineY = firstBaseline + line * lineHeight;
    const raw = decode(ch.charCodeAt(0));

    if (!raw || raw.strokes.length === 0) {
      glyphs.push(blank(ch, i, x, baselineY));
      x += advances[i];
      continue;
    }

    const strokes: HandwritingStroke[] = [];
    let totalLength = 0;

    for (const stroke of raw.strokes) {
      let d = "";
      let length = 0;
      let px = 0;
      let py = 0;
      for (let k = 0; k < stroke.length; k++) {
        const ay = (stroke[k][1] - BASELINE) * scale + baselineY;
        // Slant is applied about THIS line's baseline, so lower lines don't
        // drift sideways the way a whole-block shear would make them.
        const ax = stroke[k][0] * scale + x + (baselineY - ay) * slant;
        d += (k === 0 ? "M" : "L") + round(ax) + " " + round(ay);
        if (k > 0) length += Math.hypot(ax - px, ay - py);
        px = ax;
        py = ay;
      }
      if (length > 0) {
        strokes.push({ d, length });
        totalLength += length;
      }
    }

    glyphs.push({
      char: ch,
      index: i,
      x,
      baselineY,
      advance: advances[i],
      strokes,
      totalLength,
    });
    x += advances[i];
  }

  return {
    glyphs,
    lineHeight,
    firstBaseline,
    lineCount: line + 1,
    height: firstBaseline + line * lineHeight + HERSHEY_DESCENT * scale,
  };
}

function blank(char: string, index: number, x: number, baselineY: number): HandwritingGlyph {
  return { char, index, x, baselineY, advance: 0, strokes: [], totalLength: 0 };
}

function round(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Line height the layout will use for a given size, so a field can set up its
 *  hidden TextInput to match before anything has been measured. */
export function handwritingLineHeight(fontSize: number): number {
  return (
    ((HERSHEY_ASCENT + HERSHEY_DESCENT) / HERSHEY_ASCENT + LINE_GAP) * fontSize
  );
}

/** Merge many glyphs into ONE path. Nothing that is already finished needs its
 *  own node, so a settled line costs a single <Path> instead of one per stroke. */
export function mergePaths(glyphs: HandwritingGlyph[]): string {
  let d = "";
  for (const g of glyphs) for (const s of g.strokes) d += s.d;
  return d;
}
