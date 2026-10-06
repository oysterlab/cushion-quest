// Chapter 1 — 성 아랫마을. 15 columns of 64px; the floor is always solid and
// `tiers` lists the three ledges from the lowest (y 492) to the highest (y 164), '#' = slab.
// Tiers are 164px apart so every ledge is one jump up. spawns: [type, col, delayFrames].
window.LEVELS = [
  {
    chapter: 1, n: 1, name: "마을 광장", en: "VILLAGE SQUARE", bg: "bg1", tiles: "slab1", music: "town",
    tiers: [
      "..###########..",
      "#####.....#####",
      "...####.####...",
    ],
    spawns: [["goblin", 4, 0], ["goblin", 10, 20], ["goblin", 7, 50], ["goblin", 1, 80], ["goblin", 13, 110]],
  },
  {
    chapter: 1, n: 2, name: "시장 거리", en: "MARKET STREET", bg: "bg2", tiles: "slab2", music: "town",
    tiers: [
      "#####.....#####",
      "...#########...",
      "#####.....#####",
    ],
    spawns: [["goblin", 1, 0], ["goblin", 13, 15], ["raccoon", 7, 40], ["goblin", 4, 70], ["raccoon", 10, 100], ["goblin", 7, 130]],
  },
  {
    chapter: 1, n: 3, name: "지붕 위", en: "ROOFTOPS", bg: "bg3", bgScale: 1.085, tiles: "slab3", music: "rooftop",
    tiers: [
      "..####...####..",
      "####..###..####",
      "##....###....##",
    ],
    // three waves: sock-throwing bunnies take the high roofs first, then reinforcements keep the pressure on
    spawns: [["bunny", 7, 0], ["bunny", 1, 20], ["goblin", 4, 40], ["raccoon", 13, 60],
             ["raccoon", 10, 480], ["goblin", 0, 500], ["goblin", 14, 520],
             ["bunny", 13, 900], ["raccoon", 3, 920], ["raccoon", 11, 940]],
  },
  {
    chapter: 1, n: 4, dog: true, name: "성문 다리", en: "CASTLE BRIDGE", bg: "bg4", tiles: "slab4", music: "rooftop",
    tiers: [
      "...####.####...",
      "####.......####",
      "...#########...",
    ],
    spawns: [["raccoon", 7, 0], ["bunny", 2, 15], ["bunny", 12, 30], ["goblin", 1, 50], ["raccoon", 13, 70],
             ["goblin", 5, 520], ["bunny", 9, 540], ["raccoon", 7, 560],
             ["goblin", 2, 960], ["raccoon", 12, 980], ["bunny", 7, 1000]],
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
    tip: "방패는 등 뒤로! 구슬로 날려도 돼!",
    tiers: [
      "...#########...",
      "#####.....#####",
      "....###.###....",
    ],
    spawns: [["goblin", 3, 0], ["goblin", 11, 20], ["shield", 7, 150], ["goblin", 12, 330], ["shield", 2, 600]],
  },
  {
    chapter: 2, n: 2, name: "토피어리 정원", en: "TOPIARY GARDEN", bg: "bg2_2", dim: 0.16, tiles: "slab_planter", music: "garden",
    tip: "벽에 박혀 뒤집힌 단추병을 빨아들여!",
    tiers: [
      "####.......####",
      "...#########...",
      "#####.....#####",
    ],
    spawns: [["goblin", 2, 0], ["goblin", 12, 20], ["button", 7, 150], ["button", 2, 420], ["raccoon", 7, 560]],
  },
  {
    chapter: 2, n: 3, name: "분수 둘레", en: "ROUND THE FOUNTAIN", bg: "bg2_3", tiles: "slab_marble", music: "garden", stamp: [0, 3],
    tiers: [
      "..####...####..",
      "######...######",
      "##..#######....",
    ],
    spawns: [["goblin", 7, 0], ["shield", 3, 30], ["button", 11, 80], ["bunny", 7, 140], ["goblin", 12, 200], ["shield", 12, 260]],
  },
  {
    chapter: 2, n: 4, name: "정문 접수대", en: "THE FRONT DESK", bg: "bg2_4", bgScale: 1.05, dim: 0.18, rim: "rgba(255,226,150,.9)", tiles: "slab_desk", music: "garden",
    tiers: [
      "###.#######.###",
      "..###.....###..",
      "####.......####",
    ],
    spawns: [["goblin", 4, 0], ["shield", 10, 20], ["button", 7, 70], ["bunny", 1, 120], ["goblin", 13, 160], ["shield", 5, 260], ["button", 4, 320], ["raccoon", 9, 380]],
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
    tip: "젖은빨래 너구리를 빨면 물방울 탄!",
    tiers: [
      "..###########..",
      "#####.....#####",
      "...####.####...",
    ],
    spawns: [["wetcoon", 3, 0], ["goblin", 11, 20], ["wetcoon", 12, 200], ["goblin", 2, 260], ["raccoon", 7, 420]],
  },
  {
    chapter: 3, n: 2, name: "거품 건너편", en: "ACROSS THE SUDS", bg: "bg3_2", tiles: "slab_tub", music: "laundry",
    tip: "거품모자는 물방울 구슬로 한 방!",
    tiers: [
      "####.......####",
      "...#########...",
      "######...######",
    ],
    spawns: [["wetcoon", 7, 0], ["foamgob", 2, 60], ["foamgob", 12, 200], ["goblin", 7, 300], ["foamgob", 4, 460]],
  },
  {
    chapter: 3, n: 3, name: "세탁통 사이", en: "BETWEEN THE TUBS", bg: "bg3_3", tiles: "slab_laundry", music: "laundry", stamp: [13, 3],
    tiers: [
      "###..#####..###",
      "..####...####..",
      "##..#######..##",
    ],
    spawns: [["wetcoon", 1, 0], ["foamgob", 13, 20], ["goblin", 7, 90], ["foamgob", 4, 200], ["wetcoon", 10, 300], ["bunny", 7, 420]],
  },
  {
    chapter: 3, n: 4, name: "익숙한 모서리", en: "A FAMILIAR CORNER", bg: "bg3_4", dim: 0.12, rim: "rgba(190,235,255,.85)", tiles: "slab_tub", music: "laundry", after: "memory",
    tiers: [
      "#####.....#####",
      "...#########...",
      "####..###..####",
    ],
    spawns: [["foamgob", 3, 0], ["foamgob", 11, 20], ["wetcoon", 7, 80], ["shield", 2, 160], ["raccoon", 12, 240], ["foamgob", 7, 330], ["wetcoon", 1, 420], ["bunny", 13, 480]],
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
    tip: "상자토끼는 다가가면 뚜껑을 열어!",
    tiers: [
      "..###########..",
      "####.......####",
      "....#######....",
    ],
    spawns: [["boxbun", 4, 0], ["goblin", 10, 20], ["boxbun", 11, 180], ["boxbun", 2, 320], ["goblin", 7, 420]],
  },
  {
    chapter: 4, n: 2, name: "값표의 행렬", en: "PRICE TAG PARADE", bg: "bg4_2", tiles: "slab_coin", music: "vault",
    tip: "값표를 번쩍 들 때 빨아들여!",
    tiers: [
      "#####.....#####",
      "...#########...",
      "####.......####",
    ],
    spawns: [["goblin", 2, 0], ["taggob", 12, 40], ["boxbun", 7, 160], ["taggob", 3, 300], ["goblin", 11, 420]],
  },
  {
    chapter: 4, n: 3, name: "진열대 미로", en: "SHOWCASE MAZE", bg: "bg4_3", tiles: "slab_gold", music: "vault", stamp: [1, 3],
    tiers: [
      "##.###...###.##",
      "....#######....",
      "##..##...##..##",
    ],
    spawns: [["taggob", 7, 0], ["boxbun", 2, 30], ["boxbun", 12, 90], ["goblin", 4, 180], ["taggob", 11, 280], ["bunny", 7, 400]],
  },
  {
    chapter: 4, n: 4, name: "최상급 분류실", en: "THE GRADING ROOM", bg: "bg4_4", dim: 0.15, rim: "rgba(255,226,150,.9)", tiles: "slab_coin", music: "vault",
    tiers: [
      "###.#######.###",
      "..###.....###..",
      "####.......####",
    ],
    spawns: [["taggob", 3, 0], ["taggob", 11, 20], ["boxbun", 7, 80], ["shield", 1, 150], ["boxbun", 13, 220], ["raccoon", 7, 300], ["taggob", 5, 380], ["bunny", 9, 460]],
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
    tip: "음표에 맞으면 꾸벅! 양을 빨면 구름 탄!",
    tiers: [
      "..###########..",
      "#####.....#####",
      "...####.####...",
    ],
    spawns: [["sheep", 7, 0], ["goblin", 2, 20], ["goblin", 12, 120], ["sheep", 3, 260], ["raccoon", 11, 400]],
  },
  {
    chapter: 5, n: 2, name: "잠든 박쥐", en: "SLEEPING BATS", bg: "bg5_2", tiles: "slab_balcony", music: "night",
    tip: "박쥐 밑을 지나면 덮쳐 와! 내려앉으면 잡자",
    tiers: [
      "#####.....#####",
      "..###########..",
      "....#######....",
    ],
    spawns: [["goblin", 2, 0], ["bat", 4, 0], ["bat", 10, 60], ["goblin", 12, 150], ["bat", 7, 250], ["sheep", 7, 380]],
  },
  {
    chapter: 5, n: 3, name: "달빛 우회로", en: "MOONLIT DETOUR", bg: "bg5_3", tiles: "slab_moon", music: "night", stamp: [7, 3],
    tip: "구름 탄은 값표도 뚫고 재워 버려!",
    tiers: [
      "###..#####..###",
      "....##...##....",
      "##....###....##",
    ],
    spawns: [["sheep", 2, 0], ["bat", 7, 20], ["goblin", 12, 60], ["taggob", 4, 180], ["bat", 11, 260], ["sheep", 12, 360], ["raccoon", 7, 460]],
  },
  {
    chapter: 5, n: 4, name: "꽤 좋은 자리", en: "A RATHER NICE SPOT", bg: "bg5_4", dim: 0.2, rim: "rgba(205,200,255,.85)", tiles: "slab_balcony", music: "night", after: "choice",
    tiers: [
      "####..###..####",
      "...##.....##...",
      "#####.....#####",
    ],
    spawns: [["sheep", 3, 0], ["sheep", 11, 20], ["bat", 7, 60], ["shield", 2, 150], ["bat", 4, 220], ["foamgob", 12, 280], ["taggob", 7, 360], ["sheep", 7, 460]],
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
    tip: "근위병은 돌진 뒤 헥헥댈 때 잡아!",
    tiers: [
      "..###########..",
      "#####.....#####",
      "...####.####...",
    ],
    spawns: [["guard", 3, 0], ["goblin", 11, 20], ["goblin", 2, 150], ["guard", 12, 260], ["raccoon", 7, 400]],
  },
  {
    chapter: 6, n: 2, name: "쌓고 넘기고", en: "PILLOW PILES", bg: "bg6_2", tiles: "slab_throne", music: "throne",
    tip: "베개짐 너구리를 빨면 커다란 베개 탄!",
    tiers: [
      "#####.....#####",
      "...#########...",
      "####.......####",
    ],
    spawns: [["pillowcoon", 7, 0], ["goblin", 2, 20], ["guard", 12, 120], ["pillowcoon", 2, 260], ["bunny", 12, 360], ["goblin", 7, 460]],
  },
  {
    chapter: 6, n: 3, name: "반송실 위층", en: "RETURNS, UPSTAIRS", bg: "bg6_3", tiles: "slab_royal", music: "throne", stamp: [7, 3],
    tiers: [
      "###.#######.###",
      "..###.....###..",
      "....#######....",
    ],
    spawns: [["guard", 2, 0], ["pillowcoon", 12, 30], ["sheep", 7, 100], ["boxbun", 4, 200], ["foamgob", 10, 280], ["guard", 12, 380], ["bat", 7, 450]],
  },
  {
    chapter: 6, n: 4, name: "마지막 운반대", en: "THE LAST CONVEYOR", bg: "bg6_4", dim: 0.12, rim: "rgba(255,214,160,.9)", tiles: "slab_throne", music: "throne",
    tiers: [
      "####..###..####",
      "..###########..",
      "###.........###",
    ],
    spawns: [["guard", 3, 0], ["guard", 11, 20], ["pillowcoon", 7, 90], ["taggob", 1, 160], ["wetcoon", 13, 220], ["sheep", 7, 300], ["bat", 4, 360], ["guard", 10, 430], ["raccoon", 7, 520]],
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
