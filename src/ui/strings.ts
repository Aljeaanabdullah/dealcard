// كل النصوص الظاهرة للاعب تمر من هنا (بدون نصوص مكتوبة مباشرة داخل الواجهة).
// المرحلة 10 تحوّل هذا الملف لملفات ترجمة عربي + إنجليزي.

export const S = {
  appName: 'DEAL Q8',
  tagline: 'لعبة كروت خليجية لأربعة لاعبين',

  // شاشة البداية
  playVsBots: 'لعب ضد البوتات',
  winCondition: 'شرط الفوز',
  sets: (n: number) => `${n} أطقم مختلفة`,
  start: 'ابدأ اللعب',

  // الرئيسية
  nickname: 'الاسم المستعار',
  namePlaceholder: 'اكتب اسمك',
  createRoom: 'إنشاء غرفة خاصة',
  joinByCode: 'دخول',
  codePlaceholder: 'كود الغرفة',
  onlineUnavailable: 'اللعب أونلاين يحتاج إعداد Supabase',

  // اللعب العشوائي
  searching: 'جاري البحث عن لاعبين',
  searchingHint: 'شرط الفوز: 6 أطقم مختلفة',
  botsIn: (seconds: number) => `البوتات تكمل العدد بعد ${seconds} ثانية`,
  cancelSearch: 'إلغاء',

  // غرفة الانتظار
  lobbyTitle: 'غرفة الانتظار',
  playersCount: (n: number) => `اللاعبون ${n} من 4`,
  roomCode: 'كود الغرفة',
  shareCode: 'شاركه مع أصحابك',
  hostChooses: 'شرط الفوز · يختاره صاحب الغرفة',
  host: 'صاحب الغرفة',
  joined: 'داخل',
  emptySeat: 'مقعد فاضي',
  botWillFill: 'بوت يكمل العدد عند البدء',
  waitingHost: 'ننتظر صاحب الغرفة يبدأ',
  leave: 'خروج',
  disconnected: 'انقطع',

  // أخطاء الاتصال
  netError: (code: string): string => {
    switch (code) {
      case 'nameRequired':
        return 'اكتب اسمك أول';
      case 'roomFull':
        return 'الغرفة مليانة';
      case 'alreadyStarted':
        return 'اللعبة بدأت';
      case 'notInRoom':
        return 'الكود غلط';
      case 'network':
      case 'unauthorized':
        return 'ما قدرنا نتصل بالخادم';
      default:
        return 'صار خطأ، حاول مرة ثانية';
    }
  },

  // اللاعبين
  you: 'أنت',
  bot: (n: number) => `بوت ${n}`,

  // الطاولة
  yourTurn: 'دورك',
  turnOf: (name: string) => `دور ${name}`,
  played: (used: number, limit: number) => `لعبت ${used} من ${limit}`,
  drawPile: 'كومة السحب',
  fire: 'النار',
  inHand: (n: number) => `باليد ${n}`,
  bank: (n: number) => `البنك ${n}`,
  myBank: (n: number) => `البنك · ${n}`,
  properties: 'العقارات',
  completeSets: (n: number, target: number) => `الأطقم الكاملة ${n} من ${target}`,
  immune: 'حصانه',
  targeted: 'انلعب عليه',
  skipped: 'استريح',
  looseBuilding: 'بدون طقم',
  draw: 'اسحب',
  endTurn: 'إنهاء الدور',
  discardFirst: 'ارم الزايد',
  waiting: 'انتظر...',
  revealedHand: (name: string) => `يد ${name}:`,
  tapCard: 'اضغط كرت عشان تلعبه',

  // الرئيسية (التصميم الجديد)
  hello: (name: string) => `هلا، ${name}`,
  guest: 'ضيف',
  randomPlay: 'لعب عشوائي',
  randomDesc: 'مطابقة تلقائية مع لاعبين، والبوتات تكمل العدد',
  createDesc: 'غرفة بكود للأصحاب',
  joinTitle: 'دخول بكود',
  joinDesc: 'ادخل غرفة صاحبك',
  botsDesc: 'أنت و3 بوتات',
  settings: 'الإعدادات',
  soon: 'قريباً',
  save: 'حفظ',
  enterName: 'اكتب اسمك المستعار',

  // نوافذ اللعب
  playIt: 'العبه',
  playJoker: 'حط الجيكر',
  moveIt: 'انقله',
  askRent: 'اطلب الإيجار',
  buildLoose: 'جنب البنك (بدون طقم)',
  confirm: 'تأكيد',
  chooseAs: 'اختر الكرت اللي يصيره',
  chooseProperty: 'اختر العقار',
  chooseYours: 'اختر عقارك اللي تعطيه',
  chooseColor: 'اختر الطقم',
  chooseYourSet: 'اختر طقمك اللي تعطيه',
  chooseHandCard: 'اختر كرت من يده (بدون ما تشوف)',
  chooseHandCardOf: (name: string) => `اختر كرت من يد ${name} (بدون ما تشوف)`,
  chooseDouble: 'مع دوبل ايجار؟',
  withoutDouble: 'بدون دوبل',
  cardNumber: (n: number) => `كرت ${n}`,
  playerInfo: (bank: number, properties: number) => `البنك ${bank} · العقارات ${properties}`,
  playedAgainstYou: 'انلعب ضدك',
  playedCard: 'الكرت الملعوب',
  responseCards: 'كروت الرد اللي بيدك',
  responseNote: 'كرت الرد ما ينحسب من الـ3 كروت.',
  playedOnYou: (card: string) => `لعب عليك: ${card}`,
  bankSection: 'البنك · اختر كروت الدفع',
  buildingsSection: 'المباني · تندفع إذا خلص البنك',
  propertiesSection: 'العقارات · تندفع بقيمتها إذا خلصت المباني',
  noChange: 'ما فيه باقي: إذا دفعت أكثر من المطلوب ما يرجع لك الفرق.',
  paySelectedDinar: (selected: number, amount: number) => `المحدد: ${selected} من ${amount} دنانير`,

  // الطاولة (ملاحظات صاحب المشروع)
  setsShort: (n: number) => `الأطقم الكاملة ${n}`,
  attackBanner: (actor: string, card: string, targets: string) => `${actor} لعب ${card} على ${targets}`,
  skippedTimes: (n: number) => `استريح ×${n}`,

  // تأثير كل كرت (النص من prd.md القسم 5.4)
  effect: {
    rent: 'ادفع إيجار اللون المختار',
    qarqash: 'لاعب تختاره يدفع لك 5 دنانير',
    qardIskan: 'لاعب تختاره يدفع لك 7 دنانير',
    eyadi: 'كل اللاعبين يدفعون لك دينارين',
    tathmeen: 'تختار لاعب واحد يدفع إيجار جميع أطقمك الكاملة',
    doubleRent: 'ينلعب مع كرت إيجار ويضاعفه',
    boog: 'تسرق عقار واحد من لاعب',
    boogDouble: 'تسرق عقارين من نفس اللاعب',
    boogJoker: 'تسرق كرت جيكر من لاعب',
    baddel: 'تبدل عقار واحد عندك بعقار واحد عند لاعب',
    rahatAlek: 'تاخذ طقم كامل من لاعب',
    endebes: 'تبدل طقم كامل عندك بطقم كامل عند لاعب',
    ezalah: 'تزيل ورقة عقار من طقم كامل عند لاعب وتاخذها',
    etHas: 'تبدل كل كروت يدك مع كروت يد لاعب',
    werathtek: 'تختار كرت من يد لاعب بدون ما تشوفها وتاخذه',
    mukhalafah: 'تحرق كرت من يد لاعبين بدون ما تشوف',
    draw2: 'تسحب كرتين إضافيتين',
    extraPlay: 'تلعب 4 كروت بدل 3 بهذا الدور',
    estareeh: 'لاعب تختاره يفوّت دوره القادم',
    ekshef: 'تشوف يد لاعب واحد',
    tebWetkhayyar: 'يصير أي أكشن باللعبة تختاره',
    malekAmal: 'يلغي أي أكشن ضدك',
    hayyour: 'الأكشن يرجع على اللي لعبه وأنت المستفيد',
    fazaah: 'تفزع له وتلغي الأكشن عنه',
    hasanah: 'تحميك من كل الأكشن لين يرجع دورك',
    maTshoofShar: 'يلغي إيجار مطلوب منك',
    edfaaliEjari: 'لاعب ثاني تختاره يدفعه عنك',
  } as Record<string, string>,

  // أنواع الكروت
  kindProperty: 'عقار',
  kindMoney: 'فلوس',
  kindAction: 'أكشن',
  kindDefense: 'رد',
  kindRent: 'إيجار',
  kindBuilding: 'مبنى',
  joker: 'جيكر',
  dinar: 'دينار',
  value: (n: number) => `القيمة ${n}`,
  rentBonus: (n: number) => `الإيجار +${n}`,
  rentOne: 'ايجار شخص',
  rentAll: 'ايجار الجميع',
  anyColor: 'أي لون',

  // النوافذ
  cancel: 'رجوع',
  chooseAction: 'وش تبي تسوي بالكرت؟',
  chooseTarget: 'اختر اللاعب',
  noMoves: 'ما فيه لعبة لهالكرت الحين',
  payTitle: (amount: number, name: string) => `ادفع ${amount} لـ ${name}`,
  paySelected: (selected: number, amount: number) => `المحدد: ${selected} من ${amount}`,
  payHint: 'من البنك أولاً، ثم المباني، ثم العقارات. ما فيه باقي.',
  payAuto: 'اختيار تلقائي',
  payConfirm: 'ادفع',
  respondTitleOnYou: (name: string) => `${name} لعب عليك`,
  respondTitleOnOther: (name: string, target: string) => `${name} لعب على ${target}`,
  respondCounter: (name: string, card: string) => `${name} رد بـ ${card}`,
  noResponse: 'ما أرد',

  // وصف الحركات
  playProperty: 'حط العقار',
  bankMoney: 'حطه بالبنك',
  playJokerIn: (color: string) => `حط الجيكر مع ${color}`,
  moveJokerTo: (color: string) => `انقل الجيكر إلى ${color}`,
  buildOn: (color: string) => `حطه على طقم ${color}`,
  rentOf: (color: string, amount: number) => `إيجار ${color} (${amount})`,
  from: (name: string) => `من ${name}`,
  fromAll: 'من الجميع',
  withDouble: 'مع دوبل ايجار',
  on: (name: string) => `على ${name}`,
  as: (card: string) => `كـ ${card}`,
  takes: (what: string) => `ياخذ: ${what}`,
  gives: (what: string) => `يعطي: ${what}`,
  wholeSet: (color: string) => `طقم ${color}`,
  handCard: (n: number) => `الكرت رقم ${n} باليد`,
  inColor: (color: string) => `بلون ${color}`,
  amount: (n: number) => `${n} دينار`,
  // خيار واحد بنفس الاسم: الكرت يروح للنار، سواء حرق بالدور أو رمي الزايد.
  burn: 'احرقه بالنار',
  discard: 'احرقه بالنار',
  respondWith: (card: string) => `رد بـ ${card}`,
  payer: (name: string) => `يدفع عني: ${name}`,
  cancelOnly: 'يلغي فقط',

  // الأحداث
  eventDraw: (name: string) => `${name} سحب`,
  eventEndTurn: (name: string) => `${name} أنهى دوره`,
  eventPlayed: (name: string, what: string) => `${name}: ${what}`,
  eventPaid: (name: string, amount: number) => `${name} دفع ${amount}`,
  eventPassed: (name: string) => `${name} ما رد`,
  eventTimeout: 'انتهى وقتك وانتهى دورك تلقائياً',

  // نهاية اللعبة
  winner: 'الفائز',
  youWon: 'مبروك، فزت!',
  completed: (n: number) => `كمّل ${n} أطقم مختلفة`,
  summary: 'ملخص اللعبة',
  player: 'اللاعب',
  setsColumn: 'الأطقم الكاملة',
  bankColumn: 'البنك',
  playAgain: 'إعادة اللعب',
} as const;
