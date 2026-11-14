// رسم شخصيات اللاعبين — prd.md القسم 6
// شخصيات أصلية خاصة بـ DEAL Q8، مرسومة بأشكال بسيطة (مستطيلات ودوائر) بدون صور ولا مكتبات.
// الدالة خالصة: تعطي طبقات الرسم بمقاس معيّن، والواجهة تعرضها كما هي.

import { AVATAR_COUNT, BOT_AVATAR, normalizeAvatar } from '../data/avatars';

type Head = 'ghutra' | 'shemagh' | 'hijab' | 'hair' | 'curly' | 'long' | 'taqiyah' | 'cap' | 'bald';
type FacialHair = 'none' | 'mustache' | 'beard' | 'goatee';
type Glasses = 'none' | 'sun' | 'round';

interface AvatarSpec {
  readonly background: string;
  readonly skin: string;
  readonly head: Head;
  /** لون الغترة أو الحجاب أو الطاقية أو الكاب */
  readonly headColor: string;
  readonly hairColor: string;
  readonly facialHair: FacialHair;
  readonly body: string;
  readonly glasses: Glasses;
}

const SKIN = { light: '#F3CFA6', medium: '#E8B98A', tan: '#C68E5E', dark: '#8D5A3B' } as const;
const INK = '#1B1B1B';
const WHITE = '#F7F4EC';
const SHEMAGH_RED = '#C8372D';

/** الشخصيات الـ12 بالترتيب. رقم الشخصية = مكانها هنا. */
const SPECS: readonly AvatarSpec[] = [
  { background: '#1F7A8C', skin: SKIN.medium, head: 'ghutra', headColor: WHITE, hairColor: INK, facialHair: 'mustache', body: WHITE, glasses: 'none' },
  { background: '#F2C14E', skin: SKIN.tan, head: 'shemagh', headColor: SHEMAGH_RED, hairColor: INK, facialHair: 'beard', body: WHITE, glasses: 'none' },
  { background: '#6B4E9B', skin: SKIN.medium, head: 'taqiyah', headColor: WHITE, hairColor: '#D9D9D9', facialHair: 'beard', body: '#8B5A2B', glasses: 'none' },
  { background: '#2E9E5B', skin: SKIN.light, head: 'hair', headColor: INK, hairColor: INK, facialHair: 'none', body: '#1F3C88', glasses: 'none' },
  { background: '#E88FB0', skin: SKIN.light, head: 'hijab', headColor: '#2B2B2B', hairColor: INK, facialHair: 'none', body: '#2B2B2B', glasses: 'none' },
  { background: '#F4D03F', skin: SKIN.medium, head: 'hijab', headColor: '#1F8A8A', hairColor: INK, facialHair: 'none', body: '#1F8A8A', glasses: 'round' },
  { background: '#D7372F', skin: SKIN.tan, head: 'ghutra', headColor: WHITE, hairColor: INK, facialHair: 'goatee', body: WHITE, glasses: 'sun' },
  { background: '#7EC8E3', skin: SKIN.tan, head: 'curly', headColor: INK, hairColor: '#5A3A1E', facialHair: 'none', body: '#F08A24', glasses: 'none' },
  { background: '#8E5BB5', skin: SKIN.light, head: 'long', headColor: INK, hairColor: '#6B3F1D', facialHair: 'none', body: '#E4572E', glasses: 'none' },
  { background: '#3C6E47', skin: SKIN.medium, head: 'shemagh', headColor: SHEMAGH_RED, hairColor: '#8C8C8C', facialHair: 'mustache', body: WHITE, glasses: 'round' },
  { background: '#F08A24', skin: SKIN.light, head: 'cap', headColor: '#1F3C88', hairColor: '#5A3A1E', facialHair: 'goatee', body: '#F7F4EC', glasses: 'none' },
  { background: '#1F3C88', skin: SKIN.dark, head: 'bald', headColor: INK, hairColor: INK, facialHair: 'beard', body: '#F2C14E', glasses: 'none' },
];

if (SPECS.length !== AVATAR_COUNT) throw new Error('عدد الشخصيات المرسومة لازم يساوي AVATAR_COUNT');

export interface LayerStyle {
  readonly position: 'absolute';
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly backgroundColor: string;
  readonly borderTopLeftRadius: number;
  readonly borderTopRightRadius: number;
  readonly borderBottomLeftRadius: number;
  readonly borderBottomRightRadius: number;
  readonly borderWidth?: number;
  readonly borderColor?: string;
}

export interface AvatarLayer {
  readonly key: string;
  readonly style: LayerStyle;
}

export interface AvatarDrawing {
  readonly background: string;
  readonly layers: readonly AvatarLayer[];
}

interface Corners {
  readonly top?: number;
  readonly bottom?: number;
  readonly all?: number;
}

/** يرسم الشخصية داخل مربع 100×100 ثم يكبّرها للمقاس المطلوب. */
export function avatarDrawing(avatar: number, size: number): AvatarDrawing {
  const k = size / 100;
  const layers: AvatarLayer[] = [];

  const box = (key: string, x0: number, y0: number, x1: number, y1: number, color: string, corners: Corners = {}, border?: string) => {
    const top = (corners.top ?? corners.all ?? 0) * k;
    const bottom = (corners.bottom ?? corners.all ?? 0) * k;
    layers.push({
      key,
      style: {
        position: 'absolute',
        left: x0 * k,
        top: y0 * k,
        width: (x1 - x0) * k,
        height: (y1 - y0) * k,
        backgroundColor: color,
        borderTopLeftRadius: top,
        borderTopRightRadius: top,
        borderBottomLeftRadius: bottom,
        borderBottomRightRadius: bottom,
        ...(border ? { borderWidth: Math.max(1, 1.6 * k), borderColor: border } : {}),
      },
    });
  };
  const dot = (key: string, cx: number, cy: number, r: number, color: string, border?: string) =>
    box(key, cx - r, cy - r, cx + r, cy + r, color, { all: r }, border);

  // البوت: وجه روبوت.
  if (avatar === BOT_AVATAR) {
    box('antenna', 48.5, 16, 51.5, 30, '#C9DAD8');
    dot('antenna-ball', 50, 14, 5, '#F2C14E');
    box('ear-left', 19, 46, 27, 60, '#8FA3AD', { all: 3 });
    box('ear-right', 73, 46, 81, 60, '#8FA3AD', { all: 3 });
    box('head', 26, 28, 74, 78, '#C9DAD8', { all: 10 });
    dot('eye-left', 40, 48, 6.5, '#0B2327');
    dot('eye-right', 60, 48, 6.5, '#0B2327');
    dot('pupil-left', 40, 48, 3, '#7EC8E3');
    dot('pupil-right', 60, 48, 3, '#7EC8E3');
    box('mouth', 37, 63, 63, 69, '#0B2327', { all: 3 });
    box('tooth-1', 44, 63, 45.5, 69, '#C9DAD8');
    box('tooth-2', 50, 63, 51.5, 69, '#C9DAD8');
    box('tooth-3', 56, 63, 57.5, 69, '#C9DAD8');
    box('body', 30, 84, 70, 110, '#8FA3AD', { top: 10 });
    return { background: '#2A5F62', layers };
  }

  const spec = SPECS[normalizeAvatar(avatar)] ?? SPECS[0];
  if (!spec) throw new Error('ما فيه شخصيات');
  const cloth = spec.head === 'ghutra' || spec.head === 'shemagh' || spec.head === 'hijab';

  // خلف الوجه: الغترة أو الحجاب أو الشعر الطويل، ثم الكتوف.
  if (cloth) box('cloth-back', 16, 12, 84, 104, spec.headColor, { top: 34 });
  if (spec.head === 'long') box('hair-back', 19, 16, 81, 90, spec.hairColor, { top: 30, bottom: 14 });
  box('body', 24, 80, 76, 110, spec.body, { top: 18 });
  if (cloth) {
    // طرفين الغترة أو الحجاب نازلين على الكتوف.
    box('cloth-left', 16, 50, 31, 104, spec.headColor, { bottom: 4 });
    box('cloth-right', 69, 50, 84, 104, spec.headColor, { bottom: 4 });
  }
  box('neck', 43, 70, 57, 84, spec.skin);

  // الوجه.
  box('face', 30, 28, 70, 76, spec.skin, { all: 20 });

  // اللحية (تحت الفم والشنب).
  if (spec.facialHair === 'beard') box('beard', 30, 60, 70, 78, spec.hairColor, { top: 5, bottom: 20 });
  if (spec.facialHair === 'goatee') box('goatee', 44, 67, 56, 79, spec.hairColor, { top: 2, bottom: 7 });

  // غطاء الراس أو الشعر فوق الجبهة.
  switch (spec.head) {
    case 'ghutra':
    case 'shemagh':
      box('cloth-top', 26, 13, 74, 36, spec.headColor, { top: 26 });
      if (spec.head === 'shemagh') {
        // نقشة الشماغ: مربعات بيضاء صغيرة.
        const marks: readonly [number, number][] = [
          [21, 44], [21, 60], [21, 76], [79, 44], [79, 60], [79, 76], [36, 30], [50, 31], [64, 30],
        ];
        marks.forEach(([cx, cy], index) => box(`mark-${index}`, cx - 2, cy - 2, cx + 2, cy + 2, WHITE));
      }
      box('agal-1', 29, 15, 71, 19, INK, { all: 2 });
      box('agal-2', 28, 21, 72, 25, INK, { all: 2 });
      break;
    case 'hijab':
      box('cloth-top', 27, 14, 73, 36, spec.headColor, { top: 26 });
      box('cloth-chin', 30, 72, 70, 82, spec.headColor, { bottom: 16 });
      break;
    case 'hair':
      box('hair', 28, 20, 72, 38, spec.hairColor, { top: 22, bottom: 3 });
      break;
    case 'long':
      box('hair', 27, 18, 73, 38, spec.hairColor, { top: 24, bottom: 2 });
      break;
    case 'curly': {
      const curls: readonly [number, number][] = [
        [29, 34], [33, 25], [42, 19], [52, 17], [62, 20], [69, 27], [72, 36], [47, 26], [58, 27], [38, 31],
      ];
      curls.forEach(([cx, cy], index) => dot(`curl-${index}`, cx, cy, 8.5, spec.hairColor));
      break;
    }
    case 'taqiyah':
      box('taqiyah', 30, 17, 70, 34, spec.headColor, { top: 20, bottom: 2 }, '#B9B2A0');
      break;
    case 'cap':
      box('cap', 28, 15, 72, 34, spec.headColor, { top: 22 });
      box('cap-brim', 24, 32, 66, 37, spec.headColor, { all: 3 });
      dot('cap-button', 50, 16, 2.5, '#F2C14E');
      break;
    case 'bald':
      break;
  }

  // الحواجب والعيون.
  const brow = spec.head === 'hijab' || spec.head === 'long' ? '#4A2E1A' : spec.hairColor === '#D9D9D9' ? '#8C8C8C' : INK;
  box('brow-left', 36, 42, 46, 44.2, brow, { all: 1 });
  box('brow-right', 54, 42, 64, 44.2, brow, { all: 1 });
  if (spec.glasses === 'sun') {
    box('glass-left', 33, 44, 48, 55, INK, { top: 3, bottom: 5 });
    box('glass-right', 52, 44, 67, 55, INK, { top: 3, bottom: 5 });
    box('glass-bridge', 47, 46, 53, 48.5, INK);
  } else {
    dot('eye-left', 41, 49.5, 2.7, INK);
    dot('eye-right', 59, 49.5, 2.7, INK);
    if (spec.glasses === 'round') {
      dot('glass-left', 41, 49.5, 7, 'transparent', INK);
      dot('glass-right', 59, 49.5, 7, 'transparent', INK);
      box('glass-bridge', 47.5, 48.5, 52.5, 50.3, INK);
    }
  }

  // الأنف والفم والشنب.
  box('nose', 48.3, 52, 51.7, 59, 'rgba(0, 0, 0, 0.16)', { all: 2 });
  const lips = spec.head === 'hijab' || spec.head === 'long' ? '#C2415B' : '#8A3B2E';
  box('mouth', 44.5, 65, 55.5, 67.6, lips, { all: 2 });
  if (spec.facialHair === 'mustache' || spec.facialHair === 'beard' || spec.facialHair === 'goatee') {
    box('mustache', 40, 59.5, 60, 64, spec.hairColor, { top: 3, bottom: 1 });
  }

  return { background: spec.background, layers };
}
