// Unit types and their categories
export const UNIT_TYPES = {
  // Solid forms
  TABLET: { value: 'tablet', label: 'Tablet', category: 'solid', baseUnit: 'piece' },
  CAPSULE: { value: 'capsule', label: 'Capsule', category: 'solid', baseUnit: 'piece' },
  STRIP: { value: 'strip', label: 'Strip', category: 'solid', baseUnit: 'piece' },
  BOX: { value: 'box', label: 'Box', category: 'solid', baseUnit: 'piece' },
  PACKET: { value: 'packet', label: 'Packet', category: 'solid', baseUnit: 'piece' },
  CARTON: { value: 'carton', label: 'Carton', category: 'solid', baseUnit: 'piece' },
  
  // Liquid forms
  BOTTLE: { value: 'bottle', label: 'Bottle', category: 'liquid', baseUnit: 'ml' },
  VIAL: { value: 'vial', label: 'Vial', category: 'liquid', baseUnit: 'ml' },
  AMPOULE: { value: 'ampoule', label: 'Ampoule', category: 'liquid', baseUnit: 'ml' },
  TUBE: { value: 'tube', label: 'Tube', category: 'liquid', baseUnit: 'ml' },
  
  // Injectable
  INJECTION: { value: 'injection', label: 'Injection', category: 'injectable', baseUnit: 'ml' },
  
  // Volume measurements
  ML: { value: 'ml', label: 'Millilitre (ml)', category: 'volume', baseUnit: 'ml', conversionFactor: 1 },
  LITRE: { value: 'litre', label: 'Litre (L)', category: 'volume', baseUnit: 'ml', conversionFactor: 1000 },
  
  // Weight measurements
  MG: { value: 'mg', label: 'Milligram (mg)', category: 'weight', baseUnit: 'mg', conversionFactor: 1 },
  GRAM: { value: 'gram', label: 'Gram (g)', category: 'weight', baseUnit: 'mg', conversionFactor: 1000 },
  KILOGRAM: { value: 'kilogram', label: 'Kilogram (kg)', category: 'weight', baseUnit: 'mg', conversionFactor: 1000000 },
};

// Conversion factors to base units
export const CONVERSIONS = {
  // Volume (base: ml)
  volume: {
    ml: 1,
    litre: 1000,
  },
  
  // Weight (base: mg)
  weight: {
    mg: 1,
    gram: 1000,
    kilogram: 1000000,
  },
};

/**
 * Convert quantity between units of the same category
 */
export function convertUnits(quantity, fromUnit, toUnit) {
  const fromUnitInfo = Object.values(UNIT_TYPES).find(u => u.value === fromUnit);
  const toUnitInfo = Object.values(UNIT_TYPES).find(u => u.value === toUnit);
  
  if (!fromUnitInfo || !toUnitInfo) {
    throw new Error('Invalid unit type');
  }
  
  // Can only convert within same category
  if (fromUnitInfo.category !== toUnitInfo.category) {
    throw new Error(`Cannot convert between ${fromUnitInfo.category} and ${toUnitInfo.category}`);
  }
  
  // If same unit, return as-is
  if (fromUnit === toUnit) {
    return quantity;
  }
  
  const category = fromUnitInfo.category;
  
  // Only volume and weight have conversions
  if (category !== 'volume' && category !== 'weight') {
    throw new Error(`Cannot convert ${fromUnit} to ${toUnit} - no conversion defined`);
  }
  
  // Convert to base unit, then to target unit
  const baseQuantity = quantity * (fromUnitInfo.conversionFactor || 1);
  const targetQuantity = baseQuantity / (toUnitInfo.conversionFactor || 1);
  
  return targetQuantity;
}

/**
 * Get all units by category
 */
export function getUnitsByCategory() {
  const categories = {
    solid: [],
    liquid: [],
    injectable: [],
    volume: [],
    weight: [],
  };
  
  Object.values(UNIT_TYPES).forEach(unit => {
    if (categories[unit.category]) {
      categories[unit.category].push(unit);
    }
  });
  
  return categories;
}

/**
 * Check if units are compatible for conversion
 */
export function areUnitsCompatible(unit1, unit2) {
  const unit1Info = Object.values(UNIT_TYPES).find(u => u.value === unit1);
  const unit2Info = Object.values(UNIT_TYPES).find(u => u.value === unit2);
  
  if (!unit1Info || !unit2Info) return false;
  
  return unit1Info.category === unit2Info.category && 
         (unit1Info.category === 'volume' || unit1Info.category === 'weight');
}

/**
 * Format quantity with unit
 */
export function formatQuantityWithUnit(quantity, unit) {
  const unitInfo = Object.values(UNIT_TYPES).find(u => u.value === unit);
  if (!unitInfo) return `${quantity} ${unit}`;
  
  return `${quantity} ${unitInfo.label}`;
}

/**
 * Suggest reorder quantity based on unit type
 */
export function suggestReorderQuantity(unitType) {
  const unitInfo = Object.values(UNIT_TYPES).find(u => u.value === unitType);
  if (!unitInfo) return 50;
  
  switch (unitInfo.category) {
    case 'solid':
      return unitType === 'carton' || unitType === 'box' ? 10 : 100;
    case 'liquid':
    case 'injectable':
      return 20;
    case 'volume':
      return unitType === 'litre' ? 5 : 1000; // ml
    case 'weight':
      return unitType === 'kilogram' ? 5 : 1000; // grams
    default:
      return 50;
  }
}

/**
 * Validate quantity for unit type
 */
export function validateQuantity(quantity, unitType) {
  if (quantity <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }
  
  const unitInfo = Object.values(UNIT_TYPES).find(u => u.value === unitType);
  if (!unitInfo) {
    return { valid: false, error: 'Invalid unit type' };
  }
  
  // For discrete units (tablets, capsules, etc.), must be integer
  if (unitInfo.category === 'solid' && !Number.isInteger(quantity)) {
    return { valid: false, error: `${unitInfo.label} quantity must be a whole number` };
  }
  
  return { valid: true };
}

/**
 * Get display info for unit type
 */
export function getUnitDisplayInfo(unitType) {
  const unitInfo = Object.values(UNIT_TYPES).find(u => u.value === unitType);
  if (!unitInfo) {
    return { label: unitType, category: 'unknown', canConvert: false };
  }
  
  return {
    label: unitInfo.label,
    category: unitInfo.category,
    canConvert: unitInfo.category === 'volume' || unitInfo.category === 'weight',
    baseUnit: unitInfo.baseUnit,
  };
}
