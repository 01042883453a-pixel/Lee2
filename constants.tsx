
import React from 'react';

export const WEATHER_ICONS: Record<string, string> = {
  'Sunny': 'wb_sunny',
  'Clear': 'wb_sunny',
  'Partly Cloudy': 'partly_cloudy_day',
  'Cloudy': 'cloud',
  'Rainy': 'rainy',
  'Thunderstorm': 'thunderstorm',
  'Snowy': 'ac_unit',
  'Drizzle': 'water_drop',
  'Mist': 'foggy'
};

export const getIconForCondition = (condition: string): string => {
  const normalized = condition.toLowerCase();
  if (normalized.includes('clear') || normalized.includes('sun')) return 'wb_sunny';
  if (normalized.includes('partly')) return 'partly_cloudy_day';
  if (normalized.includes('cloud')) return 'cloud';
  if (normalized.includes('rain') || normalized.includes('drizzle')) return 'rainy';
  if (normalized.includes('thunder')) return 'thunderstorm';
  if (normalized.includes('snow')) return 'ac_unit';
  if (normalized.includes('mist') || normalized.includes('fog')) return 'foggy';
  return 'wb_sunny';
};
