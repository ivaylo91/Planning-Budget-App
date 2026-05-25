import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faHouse,
  faMagnifyingGlass,
  faListCheck,
  faChartBar,
  faTag,
  faPlus,
  faCheck,
  faBell,
  faSliders,
  faTrash,
  faChevronRight,
  faChevronLeft,
  faWandMagicSparkles,
  faBagShopping,
  faArrowRightArrowLeft,
  faUser,
  faEye,
  faXmark,
  faBarcode,
  faBolt,
} from '@fortawesome/free-solid-svg-icons';

export interface IconProps {
  size?: number;
  color?: string;
}

export const HomeIcon            = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faHouse}                 size={size} color={color} />;
export const SearchIcon          = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faMagnifyingGlass}       size={size} color={color} />;
export const ListIcon            = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faListCheck}             size={size} color={color} />;
export const ChartIcon           = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faChartBar}              size={size} color={color} />;
export const TagIcon             = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faTag}                   size={size} color={color} />;
export const PlusIcon            = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faPlus}                  size={size} color={color} />;
export const CheckIcon           = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faCheck}                 size={size} color={color} />;
export const BellIcon            = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faBell}                  size={size} color={color} />;
export const FilterIcon          = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faSliders}               size={size} color={color} />;
export const TrashIcon           = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faTrash}                 size={size} color={color} />;
export const ChevronRightIcon    = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faChevronRight}          size={size} color={color} />;
export const ChevronLeftIcon     = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faChevronLeft}           size={size} color={color} />;
export const SparkleIcon         = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faWandMagicSparkles}     size={size} color={color} />;
export const BagIcon             = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faBagShopping}           size={size} color={color} />;
export const SwapIcon            = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faArrowRightArrowLeft}   size={size} color={color} />;
export const UserIcon            = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faUser}                  size={size} color={color} />;
export const EyeIcon             = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faEye}                   size={size} color={color} />;
export const XIcon               = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faXmark}                 size={size} color={color} />;
export const BarcodeIcon         = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faBarcode}               size={size} color={color} />;
export const BoltIcon            = ({ size = 24, color = '#3a2415' }: IconProps) => <FontAwesomeIcon icon={faBolt}                  size={size} color={color} />;
