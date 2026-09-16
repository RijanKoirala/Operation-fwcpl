import { seedDatabase } from './demoData';

const run = async () => {
  try {
    await seedDatabase(true);
    console.log('✅ Seed completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

run();
