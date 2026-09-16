import { db } from '../models/database';

export interface PredefinedGoods {
  name: string;
  category: string;
  description: string;
  unit: string;
  quantityType: 'Integer' | 'Decimal';
}

export const PREDEFINED_GOODS: PredefinedGoods[] = [
  // Fiber (Decimal KM)
  {
    name: 'FIBER-6 Core',
    category: 'Fiber',
    description: '6-Core armored optical fiber cable for distribution and FTTH rollout',
    unit: 'KM',
    quantityType: 'Decimal',
  },
  {
    name: 'FIBER-12 CORE',
    category: 'Fiber',
    description: '12-Core high-density optical fiber cable for backbone and trunk routes',
    unit: 'KM',
    quantityType: 'Decimal',
  },

  // Routers (Integer PCS)
  {
    name: 'ROUTER wifi2',
    category: 'Routers',
    description: 'Single-band 2.4GHz WiFi customer premises router',
    unit: 'PCS',
    quantityType: 'Integer',
  },
  {
    name: 'ROUTER wifi5',
    category: 'Routers',
    description: 'Dual-band AC1200 WiFi 5 gigabit ONU/router',
    unit: 'PCS',
    quantityType: 'Integer',
  },
  {
    name: 'ROUTER wifi6',
    category: 'Routers',
    description: 'Next-gen AX1800/AX3000 high-speed dual-band WiFi 6 ONU/router',
    unit: 'PCS',
    quantityType: 'Integer',
  },

  // Drop Wire (Integer PCS)
  {
    name: 'DROP WIRE 25m',
    category: 'Drop Wire',
    description: 'Pre-connectorized FTTH drop fiber cable assembly 25 meters',
    unit: 'PCS',
    quantityType: 'Integer',
  },
  {
    name: 'DROP WIRE 50m',
    category: 'Drop Wire',
    description: 'Pre-connectorized FTTH drop fiber cable assembly 50 meters',
    unit: 'PCS',
    quantityType: 'Integer',
  },
  {
    name: 'DROP WIRE 75m',
    category: 'Drop Wire',
    description: 'Pre-connectorized FTTH drop fiber cable assembly 75 meters',
    unit: 'PCS',
    quantityType: 'Integer',
  },
  {
    name: 'DROP WIRE 100m',
    category: 'Drop Wire',
    description: 'Pre-connectorized FTTH drop fiber cable assembly 100 meters',
    unit: 'PCS',
    quantityType: 'Integer',
  },
  {
    name: 'DROP WIRE 150m',
    category: 'Drop Wire',
    description: 'Pre-connectorized FTTH drop fiber cable assembly 150 meters',
    unit: 'PCS',
    quantityType: 'Integer',
  },
  {
    name: 'DROP WIRE 200m',
    category: 'Drop Wire',
    description: 'Pre-connectorized FTTH drop fiber cable assembly 200 meters',
    unit: 'PCS',
    quantityType: 'Integer',
  },
];

export const seedGoodsData = async (): Promise<void> => {
  try {
    console.log('📦 Seeding Predefined Goods Items...');
    for (const item of PREDEFINED_GOODS) {
      const existing = await db.query(
        `SELECT id FROM goods_items WHERE LOWER(name) = LOWER($1)`,
        [item.name.trim()]
      );

      if (existing.rowCount === 0) {
        await db.query(
          `INSERT INTO goods_items (name, category, description, unit, quantity_type, active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [item.name.trim(), item.category, item.description, item.unit, item.quantityType]
        );
      }
    }
    console.log('✅ Predefined goods items seeded successfully.');
  } catch (err: any) {
    console.error('⚠️ Warning during goods items seed:', err.message);
  }
};
