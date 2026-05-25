import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface DonutChartProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  label: string;
  sublabel?: string;
  labelColor?: string;
  sublabelColor?: string;
}

export function DonutChart({
  progress,
  size = 96,
  strokeWidth = 9,
  color,
  trackColor,
  label,
  sublabel,
  labelColor,
  sublabelColor,
}: DonutChartProps) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - filled);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx},${cy}`}
        />
      </Svg>
      <Text style={{ fontSize: 15, fontWeight: '800', color: labelColor ?? color, textAlign: 'center' }}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={{ fontSize: 9, color: sublabelColor ?? trackColor, textAlign: 'center', marginTop: 1 }}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}
