import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Vibration, ActivityIndicator, Animated, Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../constants/colors';
import { getProductByBarcode } from '../lib/queries';
import { XIcon, BoltIcon } from '../components/Icons';

const FRAME_SIZE = 260;
const SCAN_COOLDOWN = 1500;

export default function ScannerScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'found' | 'notfound'>('idle');
  const [statusText, setStatusText] = useState('Навочи камерата към баркод');
  const cooldownRef = useRef(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Animate scanning line
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handleBarcodeScan = async ({ data }: { data: string; type: string }) => {
    if (cooldownRef.current || status === 'scanning') return;
    cooldownRef.current = true;

    Vibration.vibrate(80);
    setStatus('scanning');
    setStatusText('Търся продукта...');

    try {
      const product = await getProductByBarcode(data);
      if (product) {
        setStatus('found');
        setStatusText(`Намерен: ${product.name}`);
        setTimeout(() => router.replace(`/product/${product.id}`), 500);
      } else {
        setStatus('notfound');
        setStatusText('Продуктът не е намерен в базата');
        setTimeout(() => {
          setStatus('idle');
          setStatusText('Навочи камерата към баркод');
          cooldownRef.current = false;
        }, SCAN_COOLDOWN);
      }
    } catch {
      setStatus('notfound');
      setStatusText('Грешка при търсенето');
      setTimeout(() => {
        setStatus('idle');
        setStatusText('Навочи камерата към баркод');
        cooldownRef.current = false;
      }, SCAN_COOLDOWN);
    }
  };

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-FRAME_SIZE / 2 + 4, FRAME_SIZE / 2 - 4],
  });

  const statusColor =
    status === 'found' ? '#7a9b66' :
    status === 'notfound' ? '#c4583a' :
    status === 'scanning' ? '#e57a4e' :
    'rgba(255,255,255,0.85)';

  // ── Permission not yet determined ────────────────────────────────────────
  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: '#111' }]}>
        <ActivityIndicator color="#e57a4e" />
      </View>
    );
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: '#111', paddingHorizontal: 32 }]}>
        <Text style={styles.permTitle}>Нужен е достъп до камерата</Text>
        <Text style={styles.permSub}>
          Позволи достъп, за да можеш да сканираш баркодове на продукти.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Позволи достъп</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.permBtn, styles.permBtnSecondary]} onPress={() => router.back()}>
          <Text style={[styles.permBtnText, { color: 'rgba(255,255,255,0.7)' }]}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] }}
        onBarcodeScanned={status === 'idle' ? handleBarcodeScan : undefined}
      />

      {/* Dark overlay — top */}
      <View style={[styles.overlay, styles.overlayTop]} />

      {/* Middle row */}
      <View style={styles.overlayMiddle}>
        <View style={styles.overlaySide} />

        {/* Scanning frame */}
        <View style={styles.frame}>
          {/* Corner marks */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Animated scan line */}
          {status !== 'notfound' && (
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslate }] },
                status === 'found' && { backgroundColor: '#7a9b66' },
              ]}
            />
          )}

          {/* Scanning spinner overlay */}
          {status === 'scanning' && (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator color="#e57a4e" size="large" />
            </View>
          )}
        </View>

        <View style={styles.overlaySide} />
      </View>

      {/* Dark overlay — bottom */}
      <View style={[styles.overlay, styles.overlayBottom]} />

      {/* Top controls */}
      <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <XIcon size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Скенер</Text>
        <TouchableOpacity
          style={[styles.iconBtn, torch && styles.iconBtnActive]}
          onPress={() => setTorch((t) => !t)}
        >
          <BoltIcon size={18} color={torch ? '#e57a4e' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Status text */}
      <View style={[styles.statusWrap, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
        <Text style={styles.hintText}>
          EAN-13 · EAN-8 · Code128 · QR
        </Text>
      </View>
    </View>
  );
}

const CORNER = 22;
const BORDER = 3;
const CORNER_COLOR = '#e57a4e';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  // Overlay sections
  overlay: { backgroundColor: 'rgba(0,0,0,0.62)' },
  overlayTop: { flex: 1 },
  overlayBottom: { flex: 1 },
  overlayMiddle: { flexDirection: 'row', height: FRAME_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },

  // Scanning frame
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderColor: CORNER_COLOR, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderColor: CORNER_COLOR, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderColor: CORNER_COLOR, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderColor: CORNER_COLOR, borderBottomRightRadius: 4 },

  scanLine: {
    position: 'absolute',
    width: FRAME_SIZE - 16,
    height: 2,
    backgroundColor: '#e57a4e',
    borderRadius: 1,
    opacity: 0.85,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Top controls
  topControls: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: 'rgba(229,122,78,0.25)' },

  // Status
  statusWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  statusText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  hintText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 },

  // Permission
  permTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  permSub: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: '#e57a4e', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32, alignSelf: 'stretch', alignItems: 'center',
  },
  permBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.1)' },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
