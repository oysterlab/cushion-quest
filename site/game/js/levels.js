// Chapter 1 — 성 아랫마을. 15 columns of 64px; the floor is always solid and
// `tiers` lists the three ledges from the lowest (y 492) to the highest (y 164), '#' = slab.
// Tiers are 164px apart so every ledge is one jump up. spawns: [type, col, delayFrames].
window.LEVELS = [
  {
    chapter: 1, n: 1, name: "마을 광장", en: "VILLAGE SQUARE", bg: "bg1", tiles: "slab1", music: "town",
    tip: "고블린 정면에 서 있으면 돌진해 와!",
    tiers: [
      "..###...###....",
      ".###.....####..",
      "####.......####",
    ],
    spawns: [["goblin", 1, 0, 3], ["bunny", 3, 5, 3], ["goblin", 12, 10, 3], ["bunny", 14, 15, 3], ["raccoon", 1, 20, 2], ["bunny", 3, 25, 2], ["goblin", 11, 30, 2], ["raccoon", 9, 35, 1], ["goblin", 4, 40, 0]],
  },
  {
    chapter: 1, n: 2, name: "시장 거리", en: "MARKET STREET", bg: "bg2", tiles: "slab2", music: "town",
    tip: "방패 고블린은 흡입 불가! 구슬 2발이나 BIG 1발",
    tiers: [
      "...###...###...",
      ".####...####...",
      "...####...####.",
    ],
    spawns: [["bunny", 4, 0, 3], ["raccoon", 6, 5, 3], ["goblin", 11, 10, 3], ["goblin", 13, 15, 3], ["bunny", 1, 20, 2], ["raccoon", 4, 25, 2], ["goblin", 8, 30, 2], ["goblin", 11, 35, 1], ["shield", 1, 40, 0]],
  },
  {
    chapter: 1, n: 3, name: "지붕 위", en: "ROOFTOPS", bg: "bg3", bgScale: 1.085, tiles: "slab3", music: "rooftop",
    tip: "도둑 보따리는 구슬로 터뜨려! 놔두면 계속 나와",
    tiers: [
      "...####...####.",
      "..####.....###.",
      "...###...###...",
    ],
    spawns: [["raccoon", 3, 0, 3], ["goblin", 5, 5, 3], ["bunny", 9, 10, 3], ["bunny", 11, 15, 3], ["raccoon", 2, 20, 2], ["goblin", 5, 25, 2], ["sack", 13, 30, 2], ["goblin", 10, 35, 1], ["goblin", 3, 40, 0]],
  },
  {
    chapter: 1, n: 4, dog: true, name: "성문 다리", en: "CASTLE BRIDGE", bg: "bg4", tiles: "slab4", music: "rooftop",
    tip: "3마리 이상 한 번에 쏘면 BIG 구슬! 단단한 적도 한 방",
    tiers: [
      "###...###...###",
      "####.......####",
      "..####.....###.",
    ],
    spawns: [["goblin", 2, 0, 3], ["bunny", 4, 5, 3], ["bunny", 11, 10, 3], ["raccoon", 13, 15, 3], ["sack", 2, 20, 2], ["goblin", 12, 25, 2], ["goblin", 14, 30, 2], ["goblin", 2, 35, 1], ["shield", 8, 40, 1], ["shield", 1, 45, 0]],
  },
  {
    chapter: 1, n: 5, name: "도둑 소굴", en: "THIEVES' DEN", bg: "bg5", bgScale: 1.2, tiles: "slab5", music: "boss", boss: true,
    tiers: [
      "....#######....",
      "#####.....#####",
      "...............",
    ],
    spawns: [],
  },
  // ---------------- Chapter 2 · 폭신 정원 (castle garden, afternoon) ----------------
  // Design: each stage teaches ONE thing in a safe setting, then combines.
  //  2-1 shield goblin alone among easy thieves (ammo first, then one shield at a time; loop routes to get behind it)
  //  2-2 button soldier alone (short walls of ledges to roll it into)
  //  2-3 both together + the optional return stamp up top
  //  2-4 climax: everything, denser
  //  2-5 herald boss: dodge the dive, punish while the stamp is stuck; papers & summoned thieves are the ammo
  {
    chapter: 2, n: 1, name: "장미 아치 길", en: "ROSE ARCHES", bg: "bg2_1", tiles: "slab_hedge", music: "garden",
    tip: "굴러오는 단추병은 그대로 빨아들일 수 있어!",
    tiers: [
      "...####...####.",
      "..###...###....",
      "..####...####..",
    ],
    spawns: [["goblin", 3, 0, 3], ["goblin", 5, 5, 3], ["goblin", 10, 10, 3], ["raccoon", 12, 15, 3], ["goblin", 2, 20, 2], ["raccoon", 4, 25, 2], ["goblin", 8, 30, 2], ["goblin", 6, 35, 1], ["button", 13, 40, 1], ["button", 14, 45, 0]],
  },
  {
    chapter: 2, n: 2, name: "토피어리 정원", en: "TOPIARY GARDEN", bg: "bg2_2", dim: 0.16, tiles: "slab_planter", music: "garden",
    tiers: [
      "...###...###...",
      "...####...####.",
      "..###.....#####",
    ],
    spawns: [["goblin", 3, 0, 3], ["goblin", 10, 5, 3], ["raccoon", 12, 10, 3], ["goblin", 14, 15, 3], ["goblin", 4, 20, 2], ["goblin", 6, 25, 2], ["raccoon", 11, 30, 2], ["goblin", 13, 35, 2], ["raccoon", 5, 40, 1], ["button", 9, 45, 1], ["raccoon", 13, 50, 0]],
  },
  {
    chapter: 2, n: 3, name: "분수 둘레", en: "ROUND THE FOUNTAIN", bg: "bg2_3", tiles: "slab_marble", music: "garden", stamp: [0, 3],
    tiers: [
      ".####...####...",
      "..####.....###.",
      "####.......####",
    ],
    spawns: [["goblin", 2, 0, 3], ["raccoon", 11, 5, 3], ["goblin", 13, 10, 3], ["raccoon", 2, 15, 2], ["raccoon", 4, 20, 2], ["sack", 11, 25, 2], ["raccoon", 13, 30, 2], ["raccoon", 2, 35, 1], ["button", 4, 40, 1], ["button", 9, 45, 1], ["button", 11, 50, 1], ["raccoon", 3, 55, 0], ["shield", 12, 60, 0]],
  },
  {
    chapter: 2, n: 4, name: "정문 접수대", en: "THE FRONT DESK", bg: "bg2_4", bgScale: 1.05, dim: 0.18, rim: "rgba(255,226,150,.9)", tiles: "slab_desk", music: "garden",
    tiers: [
      "###...###...###",
      "..####...####..",
      "...####...####.",
    ],
    spawns: [["raccoon", 3, 0, 3], ["goblin", 6, 5, 3], ["raccoon", 10, 10, 3], ["goblin", 12, 15, 3], ["goblin", 3, 20, 2], ["goblin", 9, 25, 2], ["raccoon", 12, 30, 2], ["shield", 8, 35, 1], ["raccoon", 12, 40, 1], ["shield", 14, 45, 0]],
  },
  {
    chapter: 2, n: 5, name: "왕의 전령", en: "THE KING'S MESSENGER", bg: "bg2_5", tiles: "slab_marble", music: "boss", boss: "herald",
    tiers: [
      "...###...###...",
      "...............",
      "...............",
    ],
    spawns: [],
  },
  // ---------------- Chapter 3 · 뽀송 세탁소 (castle laundry, evening steam) ----------------
  //  3-1 wet-laundry raccoon: first pull wrings out a WATER ball   3-2 foam-hat goblin: water ball pops it in one go
  //  3-3 both + stamp   3-4 climax (+ memory beat)   3-5 boss: water strips the towel armour
  {
    chapter: 3, n: 1, name: "증기 빨래터", en: "THE STEAM ROOM", bg: "bg3_1", tiles: "slab_laundry", music: "laundry",
    tip: "거품모자의 비눗방울은 흡입해서 터뜨려!",
    tiers: [
      "....###...###..",
      "..####.....###.",
      "...####...####.",
    ],
    spawns: [["foamgob", 3, 0, 3], ["goblin", 5, 5, 3], ["wetcoon", 10, 10, 3], ["foamgob", 12, 15, 3], ["goblin", 3, 20, 2], ["raccoon", 5, 25, 2], ["bunny", 12, 30, 2], ["goblin", 5, 35, 1], ["goblin", 13, 40, 0]],
  },
  {
    chapter: 3, n: 2, name: "거품 건너편", en: "ACROSS THE SUDS", bg: "bg3_2", tiles: "slab_tub", music: "laundry",
    tip: "젖은빨래 너구리는 갑자기 미끄러지듯 질주해!",
    tiers: [
      "####.......####",
      "..###.....#####",
      ".###.....####..",
    ],
    spawns: [["goblin", 1, 0, 3], ["wetcoon", 3, 5, 3], ["goblin", 9, 10, 3], ["bunny", 11, 15, 3], ["raccoon", 2, 20, 2], ["foamgob", 4, 25, 2], ["goblin", 12, 30, 2], ["goblin", 14, 35, 2], ["goblin", 2, 40, 1], ["wetcoon", 13, 45, 1], ["goblin", 1, 50, 0]],
  },
  {
    chapter: 3, n: 3, name: "세탁통 사이", en: "BETWEEN THE TUBS", bg: "bg3_3", tiles: "slab_laundry", music: "laundry", stamp: [13, 3],
    tiers: [
      ".###.....####..",
      "..####.....###.",
      "...####...####.",
    ],
    spawns: [["bunny", 4, 0, 3], ["foamgob", 6, 5, 3], ["foamgob", 11, 10, 3], ["foamgob", 2, 15, 2], ["bunny", 5, 20, 2], ["sack", 12, 25, 2], ["shield", 9, 30, 1], ["bunny", 11, 35, 1], ["goblin", 4, 40, 0], ["goblin", 11, 45, 0]],
  },
  {
    chapter: 3, n: 4, name: "익숙한 모서리", en: "A FAMILIAR CORNER", bg: "bg3_4", dim: 0.12, rim: "rgba(190,235,255,.85)", tiles: "slab_tub", music: "laundry", after: "memory",
    tiers: [
      "..####...####..",
      ".###.....####..",
      ".####...####...",
    ],
    spawns: [["bunny", 2, 0, 3], ["foamgob", 4, 5, 3], ["wetcoon", 8, 10, 3], ["raccoon", 10, 15, 3], ["sack", 1, 20, 2], ["wetcoon", 3, 25, 2], ["raccoon", 9, 30, 2], ["raccoon", 12, 35, 2], ["wetcoon", 9, 40, 1], ["shield", 12, 45, 1], ["shield", 11, 50, 0]],
  },
  {
    chapter: 3, n: 5, name: "빨래대장", en: "THE LAUNDRY CHIEF", bg: "bg3_5", tiles: "slab_tub", music: "boss", boss: "wash",
    tiers: [
      "##...........##",
      "...............",
      "...............",
    ],
    spawns: [],
  },
  // ---------------- Chapter 4 · 금딱 보물창고 (gold vault, night) ----------------
  //  4-1 box bunny (peeks when you come close; a ball knocks the lid open)   4-2 price-tag goblin (grab it while it boasts)
  //  4-3 both + stamp   4-4 climax   4-5 boss: roll balls onto the scale pans to open the glass case
  {
    chapter: 4, n: 1, name: "상자의 틈", en: "BOX ALLEY", bg: "bg4_1", tiles: "slab_gold", music: "vault",
    tip: "값표가 날아와! 점프로 넘거나 흡입해서 탄으로",
    tiers: [
      "..####.....###.",
      "..###.....#####",
      "####.......####",
    ],
    spawns: [["goblin", 0, 0, 3], ["taggob", 3, 5, 3], ["taggob", 11, 10, 3], ["raccoon", 14, 15, 3], ["taggob", 2, 20, 2], ["raccoon", 10, 25, 2], ["goblin", 12, 30, 2], ["goblin", 4, 35, 1], ["goblin", 13, 40, 1], ["goblin", 14, 45, 0]],
  },
  {
    chapter: 4, n: 2, name: "값표의 행렬", en: "PRICE TAG PARADE", bg: "bg4_2", tiles: "slab_coin", music: "vault",
    tiers: [
      "..####.....###.",
      "...###...###...",
      "..###...###....",
    ],
    spawns: [["goblin", 2, 0, 3], ["taggob", 4, 5, 3], ["taggob", 9, 10, 3], ["goblin", 4, 15, 2], ["raccoon", 9, 20, 2], ["goblin", 11, 25, 2], ["raccoon", 2, 30, 1], ["raccoon", 4, 35, 1], ["goblin", 11, 40, 1], ["raccoon", 11, 45, 0]],
  },
  {
    chapter: 4, n: 3, name: "진열대 미로", en: "SHOWCASE MAZE", bg: "bg4_3", tiles: "slab_gold", music: "vault", stamp: [2, 3],
    tip: "상자토끼는 흡입 불가! BIG 구슬로 상자를 부숴",
    tiers: [
      ".###.....####..",
      "...###...###...",
      "..####.....###.",
    ],
    spawns: [["taggob", 3, 0, 3], ["goblin", 5, 5, 3], ["goblin", 11, 10, 3], ["goblin", 13, 15, 3], ["goblin", 3, 20, 2], ["raccoon", 5, 25, 2], ["sack", 11, 30, 2], ["boxbun", 11, 35, 1], ["boxbun", 13, 40, 0]],
  },
  {
    chapter: 4, n: 4, name: "최상급 분류실", en: "THE GRADING ROOM", bg: "bg4_4", dim: 0.15, rim: "rgba(255,226,150,.9)", tiles: "slab_coin", music: "vault",
    tiers: [
      ".####...####...",
      "..####.....###.",
      "...###...###...",
    ],
    spawns: [["goblin", 3, 0, 3], ["raccoon", 9, 5, 3], ["goblin", 11, 10, 3], ["sack", 3, 15, 2], ["raccoon", 11, 20, 2], ["raccoon", 13, 25, 2], ["boxbun", 2, 30, 1], ["boxbun", 11, 35, 1], ["boxbun", 3, 40, 0], ["boxbun", 12, 45, 0]],
  },
  {
    chapter: 4, n: 5, name: "감정관", en: "THE APPRAISER", bg: "bg4_5", tiles: "slab_coin", music: "boss", boss: "appraiser",
    tiers: [
      "###.........###",
      "...............",
      "...............",
    ],
    spawns: [],
  },
  // ---------------- Chapter 5 · 별빛 침실탑 (bedroom tower, deep night) ----------------
  //  5-1 lullaby sheep (notes make you doze; inhaled it is a CLOUD ball that puts anything to sleep)
  //  5-2 sleeping bats (swoop when you pass below; catch them after they land)   5-3 both + stamp
  //  5-4 climax (+ "…내 거 아니야." beat)   5-5 boss: ring the bell twice (or one cloud ball) to make the knight take his helmet off
  {
    chapter: 5, n: 1, name: "자장가 계단", en: "LULLABY STAIRS", bg: "bg5_1", tiles: "slab_moon", music: "night",
    tip: "박쥐 밑을 지나면 덮쳐 와! 내려앉으면 잡자",
    tiers: [
      "####.......####",
      "..####...####..",
      ".###.....####..",
    ],
    spawns: [["bat", 4, 0], ["bat", 8, 5], ["bat", 12, 10], ["goblin", 1, 15, 3], ["sheep", 10, 20, 3], ["goblin", 12, 25, 3], ["goblin", 2, 30, 2], ["sheep", 4, 35, 2], ["goblin", 2, 40, 1], ["goblin", 13, 45, 0]],
  },
  {
    chapter: 5, n: 2, name: "잠든 박쥐", en: "SLEEPING BATS", bg: "bg5_2", tiles: "slab_balcony", music: "night",
    tip: "음표에 맞으면 꾸벅! 노래하는 양부터 잡자",
    tiers: [
      "...###...###...",
      "..####...####..",
      "..###...###....",
    ],
    spawns: [["bat", 3, 0], ["bat", 6, 5], ["bat", 9, 10], ["bat", 12, 15], ["goblin", 4, 20, 3], ["sheep", 8, 25, 3], ["sheep", 10, 30, 3], ["sheep", 5, 35, 2], ["sheep", 10, 40, 2], ["goblin", 9, 45, 1], ["boxbun", 12, 50, 0]],
  },
  {
    chapter: 5, n: 3, name: "달빛 우회로", en: "MOONLIT DETOUR", bg: "bg5_3", tiles: "slab_moon", music: "night", stamp: [5, 3],
    tiers: [
      "..####...####..",
      "###...###...###",
      "...###...###...",
    ],
    spawns: [["bat", 6, 0], ["bat", 9, 5], ["goblin", 3, 10, 3], ["sheep", 9, 15, 3], ["sheep", 11, 20, 3], ["goblin", 6, 25, 2], ["goblin", 8, 30, 2], ["sack", 13, 35, 2], ["goblin", 3, 40, 1], ["boxbun", 11, 45, 1], ["boxbun", 0, 50, 0]],
  },
  {
    chapter: 5, n: 4, name: "꽤 좋은 자리", en: "A RATHER NICE SPOT", bg: "bg5_4", dim: 0.2, rim: "rgba(205,200,255,.85)", tiles: "slab_balcony", music: "night", after: "choice",
    tiers: [
      "..####...####..",
      "###...###...###",
      "####.......####",
    ],
    spawns: [["bat", 4, 0], ["bat", 11, 5], ["sheep", 2, 10, 3], ["sheep", 13, 15, 3], ["sack", 1, 20, 2], ["sack", 13, 25, 2], ["boxbun", 3, 30, 1], ["boxbun", 11, 35, 1], ["boxbun", 12, 40, 0], ["boxbun", 14, 45, 0]],
  },
  {
    chapter: 5, n: 5, name: "베개기사", en: "THE PILLOW KNIGHT", bg: "bg5_5", tiles: "slab_moon", music: "boss", boss: "knight",
    tiers: [
      "##...........##",
      "...............",
      "...............",
    ],
    spawns: [],
  },
  // ---------------- Chapter 6 · 쿠션 왕좌 (throne room, dawn) ----------------
  //  6-1 royal guard (faster shield goblin)   6-2 pillow raccoon (first pull = big PILLOW ball)
  //  6-3 everything + last stamp   6-4 climax   6-5 the king: break the 3 throne supports, then punish the snagged cape
  {
    chapter: 6, n: 1, name: "새벽의 근위대", en: "THE DAWN GUARD", bg: "bg6_1", tiles: "slab_royal", music: "throne",
    tip: "근위병 돌진은 냥이보다 빨라! 체력 3, BIG 구슬은 2배",
    tiers: [
      "...####...####.",
      "...###...###...",
      "..###...###....",
    ],
    spawns: [["pillowcoon", 3, 0, 3], ["pillowcoon", 9, 5, 3], ["goblin", 3, 10, 2], ["taggob", 5, 15, 2], ["pillowcoon", 9, 20, 2], ["pillowcoon", 11, 25, 2], ["goblin", 3, 30, 1], ["goblin", 6, 35, 1], ["guard", 12, 40, 1], ["guard", 1, 45, 0], ["goblin", 14, 50, 0]],
  },
  {
    chapter: 6, n: 2, name: "쌓고 넘기고", en: "PILLOW PILES", bg: "bg6_2", tiles: "slab_throne", music: "throne",
    tip: "베개짐 너구리가 던진 베개는 흡입해서 쏠 수 있어!",
    tiers: [
      "..####...####..",
      ".####...####...",
      "....###...###..",
    ],
    spawns: [["taggob", 5, 0, 3], ["pillowcoon", 10, 5, 3], ["pillowcoon", 12, 10, 3], ["goblin", 2, 15, 2], ["taggob", 4, 20, 2], ["pillowcoon", 9, 25, 2], ["guard", 11, 30, 1], ["goblin", 2, 35, 0], ["guard", 11, 40, 0]],
  },
  {
    chapter: 6, n: 3, name: "반송실 위층", en: "RETURNS, UPSTAIRS", bg: "bg6_3", tiles: "slab_royal", music: "throne", stamp: [8, 3],
    tiers: [
      "..####.....###.",
      "..###.....#####",
      "..###...###....",
    ],
    spawns: [["pillowcoon", 2, 0, 3], ["pillowcoon", 4, 5, 3], ["goblin", 10, 10, 3], ["sack", 3, 15, 2], ["goblin", 10, 20, 2], ["sack", 12, 25, 2], ["guard", 5, 30, 1], ["goblin", 13, 35, 1], ["goblin", 3, 40, 0], ["guard", 14, 45, 0]],
  },
  {
    chapter: 6, n: 4, name: "마지막 운반대", en: "THE LAST CONVEYOR", bg: "bg6_4", dim: 0.12, rim: "rgba(255,214,160,.9)", tiles: "slab_throne", music: "throne",
    tiers: [
      "..####.....###.",
      "..###.....#####",
      "####.......####",
    ],
    spawns: [["pillowcoon", 0, 0, 3], ["pillowcoon", 2, 5, 3], ["pillowcoon", 11, 10, 3], ["pillowcoon", 13, 15, 3], ["sack", 2, 20, 2], ["goblin", 10, 25, 2], ["goblin", 12, 30, 2], ["sack", 14, 35, 2], ["guard", 5, 40, 1], ["guard", 12, 45, 1], ["guard", 0, 50, 0], ["guard", 4, 55, 0]],
  },
  {
    chapter: 6, n: 5, name: "욕심쟁이 왕", en: "THE GREEDY KING", bg: "bg6_1", tiles: "slab_royal", music: "boss", boss: "king",
    tiers: [
      "###.........###",
      "...............",
      "...............",
    ],
    spawns: [],
  },
];
