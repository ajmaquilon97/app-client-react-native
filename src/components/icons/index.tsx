import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const HomeIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1F2937',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </Svg>
);

export const CalendarIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1F2937',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </Svg>
);

export const HeartIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 24,
  color = '#1F2937',
  strokeWidth = 2,
  filled = false,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </Svg>
);

export const SettingsIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1F2937',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </Svg>
);

export const SearchIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1F2937',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </Svg>
);

export const LocationIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1F2937',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </Svg>
);

export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 24,
  color = '#F59E0B',
  filled = true,
}) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? color : 'none'}>
    <Path
      stroke={color}
      strokeWidth={filled ? 0 : 1.5}
      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
    />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#14B8A6',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M5 13l4 4L19 7"
    />
  </Svg>
);

export const PlusIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M12 4v16m8-8H4"
    />
  </Svg>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#FFFFFF',
  strokeWidth = 2.5,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M15 19l-7-7 7-7"
    />
  </Svg>
);

export const CloseCircleIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#9CA3AF',
}) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill={color}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
    />
  </Svg>
);

export const SportIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1E3A5F',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </Svg>
);

export const FootBallIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1E3A5F',
  strokeWidth = 2,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}>
    <Path
      strokeWidth={strokeWidth}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m15 10.42 4.8-5.07M19 18h3M9.5 22 21.414 9.415A2 2 0 0 0 21.2 6.4l-5.61-4.208A1 1 0 0 0 14 3v2a2 2 0 0 1-1.394 1.906L8.677 8.053A1 1 0 0 0 8 9c-.155 6.393-2.082 9-4 9a2 2 0 0 0 0 4h14"
    />
  </Svg>
);


export const WaterIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1E3A5F',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
    />
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
    />
  </Svg>
);

export const WaterIcon2: React.FC<IconProps> = ({
  size = 24,
  color = '#1E3A5F',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M2 12q2.5 2 5 0t5 0 5 0 5 0M2 19q2.5 2 5 0t5 0 5 0 5 0M2 5q2.5 2 5 0t5 0 5 0 5 0"
    />
  </Svg>
);

export const BuildingIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#1E3A5F',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </Svg>
);

export const BuildingIcon2: React.FC<IconProps> = ({
  size = 24,
  color = '#1E3A5F',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M2 10s3-3 3-8M22 10s-3-3-3-8"
    />
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M10 2c0 4.4-3.6 8-8 8M14 2c0 4.4 3.6 8 8 8M2 10s2 2 2 5M22 10s-2 2-2 5M8 15h8M2 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M14 22v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"
    />
  </Svg>
);

export const SadFaceIcon: React.FC<IconProps> = ({
  size = 24,
  color = '#9CA3AF',
  strokeWidth = 2,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      stroke={color}
      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </Svg>
);
