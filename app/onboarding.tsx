import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gradients } from '../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🛒',
    title: 'Бюджетът ви\nв топли тонове',
    body: 'Следете разходите си и пазарувайте по-умно с помощта на умен помощник.',
  },
  {
    icon: '🏷️',
    title: 'Сравнявайте цени\nв 5 магазина',
    body: 'Billa, Lidl, Kaufland, Metro и Fantastico — намерете най-добрата оферта за всеки продукт.',
  },
  {
    icon: '💡',
    title: 'Спестявайте\nвсяка седмица',
    body: 'Следете промоциите и получавайте напомняния когато надхвърлите бюджета.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  const handleNext = async () => {
    if (isLast) {
      await AsyncStorage.setItem('onboarding_done', '1');
      router.replace('/(tabs)');
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient
      colors={['#fde9d6', '#fff7ed']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Пропусни</Text>
        </TouchableOpacity>
      )}

      {/* Illustration */}
      <View style={styles.illustrationWrap}>
        <LinearGradient
          colors={['#fff7ed', '#fcdcc0']}
          style={styles.illustrationCircle}
        >
          <Text style={styles.illustrationIcon}>{slide.icon}</Text>
        </LinearGradient>
        {/* Decorative dots */}
        <View style={[styles.decoDot, { top: 20, right: 30, backgroundColor: '#ffd6b8', width: 14, height: 14 }]} />
        <View style={[styles.decoDot, { bottom: 10, left: 20, backgroundColor: '#e57a4e', opacity: 0.3, width: 10, height: 10 }]} />
        <View style={[styles.decoDot, { top: 50, left: 10, backgroundColor: '#7a9b66', opacity: 0.25, width: 18, height: 18 }]} />
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step
                ? { width: 24, backgroundColor: '#e57a4e' }
                : { width: 8, backgroundColor: '#fcdcc0' },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity onPress={handleNext} activeOpacity={0.88}>
        <LinearGradient
          colors={Gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBtn}
        >
          <Text style={styles.ctaBtnText}>{isLast ? 'Започнете' : 'Напред'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 32 },
  skipBtn: { position: 'absolute', top: 56, right: 28 },
  skipText: { fontSize: 14, color: '#b89978', fontWeight: '600' },

  illustrationWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  illustrationCircle: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
  },
  illustrationIcon: { fontSize: 72 },
  decoDot: { position: 'absolute', borderRadius: 999 },

  textBlock: { alignItems: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#3a2415', textAlign: 'center', letterSpacing: -0.5, lineHeight: 34 },
  body: { fontSize: 15, color: '#7a5c45', textAlign: 'center', lineHeight: 22 },

  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 999 },

  ctaBtn: { borderRadius: 999, paddingHorizontal: 48, paddingVertical: 16 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
