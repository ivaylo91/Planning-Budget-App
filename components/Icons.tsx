import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function Icon({ size = 24, color = '#3a2415', strokeWidth = 2, path }: IconProps & { path: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={path} />
    </Svg>
  );
}

export const HomeIcon = (p: IconProps) => <Icon {...p} path="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />;
export const SearchIcon = (p: IconProps) => <Icon {...p} path="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" />;
export const ListIcon = (p: IconProps) => <Icon {...p} path="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1" />;
export const ChartIcon = (p: IconProps) => <Icon {...p} path="M3 3v18h18M8 17V9m4 8V5m4 12v-4" />;
export const TagIcon = (p: IconProps) => <Icon {...p} path="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" />;
export const PlusIcon = (p: IconProps) => <Icon {...p} path="M12 5v14M5 12h14" />;
export const CheckIcon = (p: IconProps) => <Icon {...p} path="M20 6L9 17l-5-5" />;
export const BellIcon = (p: IconProps) => <Icon {...p} path="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />;
export const FilterIcon = (p: IconProps) => <Icon {...p} path="M4 6h16M7 12h10M10 18h4" />;
export const TrashIcon = (p: IconProps) => <Icon {...p} path="M3 6h18M19 6l-.9 14a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />;
export const ChevronRightIcon = (p: IconProps) => <Icon {...p} path="m9 18 6-6-6-6" />;
export const ChevronLeftIcon = (p: IconProps) => <Icon {...p} path="m15 18-6-6 6-6" />;
export const SparkleIcon = (p: IconProps) => <Icon {...p} path="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />;
export const BagIcon = (p: IconProps) => <Icon {...p} path="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />;
export const SwapIcon = (p: IconProps) => <Icon {...p} path="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />;
export const UserIcon = (p: IconProps) => <Icon {...p} path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />;
export const EyeIcon = (p: IconProps) => <Icon {...p} path="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />;
export const XIcon = (p: IconProps) => <Icon {...p} path="M18 6L6 18M6 6l12 12" />;
