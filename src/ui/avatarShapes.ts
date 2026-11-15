// رسم وجه الروبوت — للمقعد اللي ما له شخصية معروفة (prd.md القسم 6)
// شخصيات اللاعبين الـ12 صارت صور في avatarImages.ts، وهنا بقى وجه الروبوت بس، مرسوم بأشكال بسيطة بدون صور.
// الدالة خالصة: تعطي طبقات الرسم بمقاس معيّن، والواجهة تعرضها كما هي.

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

/** يرسم وجه الروبوت داخل مربع 100×100 ثم يكبّره للمقاس المطلوب. */
export function botDrawing(size: number): AvatarDrawing {
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
