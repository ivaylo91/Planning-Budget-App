import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

interface Props {
  uri: string | null;
  fallback: string;
  size: number;
  borderRadius?: number;
  bgColor?: string;
}

export function ProductImage({ uri, fallback, size, borderRadius = 12, bgColor = '#fcdcc0' }: Props) {
  const [errored, setErrored] = useState(false);

  const showImage = !!uri && !errored;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius, backgroundColor: bgColor }]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <Text style={[styles.emoji, { fontSize: size * 0.46 }]}>{fallback}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emoji: { textAlign: 'center' },
});
