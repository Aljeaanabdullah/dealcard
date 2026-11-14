// شاشة البداية أول ما تنفتح اللعبة: اللوقو وتحته شريط تحميل يمشي، وبعدها الرئيسية — prd.md القسم 7

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { S } from './strings';
import { theme } from './theme';

interface SplashScreenProps {
  /** مدة الشريط بالملي ثانية */
  readonly durationMs: number;
  readonly onDone: () => void;
}

// الصورة مربعة وخلفيتها سوداء، فالشاشة كلها بنفس السواد.
const LOGO = require('../../assets/logo.png') as number;

export function SplashScreen({ durationMs, onDone }: SplashScreenProps) {
  const [progress] = useState(() => new Animated.Value(0));
  const [width] = useState(() => progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }));
  // آخر نسخة من onDone بدون ما تعيد تشغيل الشريط.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    });
    animation.start();
    const timer = setTimeout(() => done.current(), durationMs);
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [progress, durationMs]);

  return (
    <View testID="splash" style={styles.root}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel={S.appName} />
      <View style={styles.track}>
        <Animated.View
          testID="splash-bar"
          style={[styles.bar, { width }]}
        />
      </View>
      <Text style={styles.text}>{S.loading}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070707',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  logo: {
    flex: 1,
    aspectRatio: 1,
  },
  track: {
    width: '42%',
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.gold,
    backgroundColor: '#1B1B1B',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.gold,
  },
  text: {
    color: theme.gold,
    fontSize: 12,
    fontWeight: '800',
  },
});
