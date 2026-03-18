/**
 * Single source of truth for class-to-color mapping across the entire UI.
 * Used by: ClassBreakdown bars, ClassSelector chips, ImageInspector overlays.
 */
export const CLASS_HEX_COLORS: Record<string, string> = {
  road: '#4A90D9',
  building: '#2ECC71',
  vegetation: '#F5A623',
  sidewalk: '#E74C8B',
  fence: '#9B59B6',
  pole: '#00BCD4',
  sky: '#85C1E9',
  car: '#E74C3C',
  truck: '#FF6B35',
  'traffic sign': '#F1C40F',
  'traffic light': '#F1C40F',
  terrain: '#8D6E63',
  wall: '#BDC3C7',
  bicycle: '#1ABC9C',
  bus: '#D35400',
  motorcycle: '#C0392B',
  person: '#FF69B4',
  rider: '#FF69B4',
  train: '#7F8C8D',
};

/**
 * Tailwind bg- classes for colored dots on chips/tags.
 * Maps to the same visual identity as CLASS_HEX_COLORS.
 */
export const CLASS_DOT_COLORS: Record<string, string> = {
  road: 'bg-[#4A90D9]',
  building: 'bg-[#2ECC71]',
  vegetation: 'bg-[#F5A623]',
  sidewalk: 'bg-[#E74C8B]',
  fence: 'bg-[#9B59B6]',
  pole: 'bg-[#00BCD4]',
  sky: 'bg-[#85C1E9]',
  car: 'bg-[#E74C3C]',
  truck: 'bg-[#FF6B35]',
  'traffic sign': 'bg-[#F1C40F]',
  'traffic light': 'bg-[#F1C40F]',
  terrain: 'bg-[#8D6E63]',
  wall: 'bg-[#BDC3C7]',
  bicycle: 'bg-[#1ABC9C]',
  bus: 'bg-[#D35400]',
  motorcycle: 'bg-[#C0392B]',
  person: 'bg-[#FF69B4]',
  rider: 'bg-[#FF69B4]',
  train: 'bg-[#7F8C8D]',
};

export function getClassColor(className: string): string {
  return CLASS_HEX_COLORS[className] || '#94A3B8';
}

export function getClassDotColor(className: string): string {
  return CLASS_DOT_COLORS[className] || 'bg-[#94A3B8]';
}
