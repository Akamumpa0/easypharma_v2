import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  UNIT_TYPES,
  convertUnits,
  getUnitsByCategory,
  areUnitsCompatible,
  formatQuantityWithUnit,
  suggestReorderQuantity,
  validateQuantity,
  getUnitDisplayInfo,
} from '../utils/unitConversions.js';

const router = Router();

// GET /api/units - Get all available unit types
router.get('/', requireAuth, async (req, res) => {
  res.json({
    units: Object.values(UNIT_TYPES),
    categories: getUnitsByCategory(),
  });
});

// POST /api/units/convert - Convert quantity between units
router.post('/convert', requireAuth, async (req, res, next) => {
  try {
    const { quantity, fromUnit, toUnit } = req.body;

    if (!quantity || !fromUnit || !toUnit) {
      return res.status(400).json({
        error: 'quantity, fromUnit, and toUnit are required',
      });
    }

    if (!areUnitsCompatible(fromUnit, toUnit)) {
      return res.status(400).json({
        error: `Cannot convert ${fromUnit} to ${toUnit} - units are not compatible`,
      });
    }

    const converted = convertUnits(parseFloat(quantity), fromUnit, toUnit);

    res.json({
      original: {
        quantity: parseFloat(quantity),
        unit: fromUnit,
        formatted: formatQuantityWithUnit(quantity, fromUnit),
      },
      converted: {
        quantity: converted,
        unit: toUnit,
        formatted: formatQuantityWithUnit(converted, toUnit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/units/compatible/:unit - Check what units are compatible for conversion
router.get('/compatible/:unit', requireAuth, async (req, res) => {
  const unitInfo = Object.values(UNIT_TYPES).find(u => u.value === req.params.unit);
  
  if (!unitInfo) {
    return res.status(404).json({ error: 'Unit type not found' });
  }

  const compatible = Object.values(UNIT_TYPES).filter(u => 
    u.category === unitInfo.category && 
    (u.category === 'volume' || u.category === 'weight')
  );

  res.json({
    unit: unitInfo,
    compatibleUnits: compatible,
  });
});

// POST /api/units/validate - Validate quantity for unit type
router.post('/validate', requireAuth, async (req, res) => {
  const { quantity, unitType } = req.body;

  if (!quantity || !unitType) {
    return res.status(400).json({ error: 'quantity and unitType are required' });
  }

  const validation = validateQuantity(parseFloat(quantity), unitType);
  res.json(validation);
});

// GET /api/units/suggest-reorder/:unitType - Get suggested reorder quantity for unit
router.get('/suggest-reorder/:unitType', requireAuth, async (req, res) => {
  const suggested = suggestReorderQuantity(req.params.unitType);
  res.json({
    unitType: req.params.unitType,
    suggestedQuantity: suggested,
  });
});

// GET /api/units/info/:unitType - Get display info for unit type
router.get('/info/:unitType', requireAuth, async (req, res) => {
  const info = getUnitDisplayInfo(req.params.unitType);
  res.json(info);
});

export default router;
