import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Slot } from '../models/Slot.js';
import { Appointment } from '../models/Appointment.js';
import { connectDB, disconnectDB } from '../config/db.js';

const SERVICES = [
  { name: 'General Consultation', provider: 'Dr. Sarah Smith, MD', duration: 30, price: 65, location: 'Suite 401 (Main Clinic)' },
  { name: 'Dental Checkup & Cleaning', provider: 'Dr. Michael Chen, DDS', duration: 45, price: 120, location: 'Dental Suite 1B' },
  { name: 'Cardiology Review', provider: 'Dr. Elena Rostova, FACC', duration: 45, price: 180, location: 'Heart Center Rm 302' },
  { name: 'Dermatology Screening', provider: 'Dr. David Kim, MD', duration: 30, price: 95, location: 'Skin Clinic Room 12' },
  { name: 'Physical Therapy Session', provider: 'Marcus Vance, DPT', duration: 60, price: 110, location: 'Rehab Center Bay 4' },
  { name: 'Eye Examination', provider: 'Dr. Rachel Patel, OD', duration: 30, price: 75, location: 'Optometry Suite 205' }
];

const TIME_BLOCKS = [
  { startTime: '09:00', endTime: '09:30' },
  { startTime: '10:00', endTime: '10:45' },
  { startTime: '11:15', endTime: '12:00' },
  { startTime: '14:00', endTime: '14:30' },
  { startTime: '15:00', endTime: '15:45' },
  { startTime: '16:30', endTime: '17:15' },
  { startTime: '18:00', endTime: '18:30' }
];

export async function seedDatabase(force: boolean = false): Promise<void> {
  console.log('🌱 Starting database seeding...');

  if (force) {
    await Appointment.deleteMany({});
    await Slot.deleteMany({});
    await User.deleteMany({});
    console.log('🧹 Cleared existing data.');
  }

  // 1. Create Demo Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const demoUser = await User.findOneAndUpdate(
    { email: 'demo.user@example.com' },
    {
      name: 'Alex Johnson',
      email: 'demo.user@example.com',
      passwordHash,
      role: 'user'
    },
    { upsert: true, new: true }
  );

  const secondUser = await User.findOneAndUpdate(
    { email: 'jane.doe@example.com' },
    {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      passwordHash,
      role: 'user'
    },
    { upsert: true, new: true }
  );

  console.log(`👤 Users ready: ${demoUser.email}, ${secondUser.email} (Password: password123)`);

  // 2. Generate Slots for today and the next 10 days
  const today = new Date();
  const slotsToInsert = [];

  for (let dayOffset = 0; dayOffset <= 10; dayOffset++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Distribute services across time blocks
    for (let i = 0; i < TIME_BLOCKS.length; i++) {
      const time = TIME_BLOCKS[i];
      const service = SERVICES[(i + dayOffset) % SERVICES.length];

      slotsToInsert.push({
        date: dateStr,
        startTime: time.startTime,
        endTime: time.endTime,
        serviceName: service.name,
        providerName: service.provider,
        durationMinutes: service.duration,
        price: service.price,
        location: service.location,
        status: 'AVAILABLE',
        version: 0
      });
    }
  }

  const createdSlots = await Slot.insertMany(slotsToInsert);
  console.log(`📅 Inserted ${createdSlots.length} available slots across the next 11 days.`);

  // 3. Create a sample booked appointment for demoUser
  if (createdSlots.length > 2) {
    const bookedSlot1 = createdSlots[1];
    bookedSlot1.status = 'BOOKED';
    await bookedSlot1.save();

    await Appointment.create({
      userId: demoUser._id,
      slotId: bookedSlot1._id,
      status: 'BOOKED',
      notes: 'Routine dental checkup and mild sensitivity review.',
      bookedAt: new Date()
    });

    console.log(`✨ Created 1 sample appointment for demo user.`);
  }

  console.log('✅ Seeding completed successfully!');
}

export async function autoSeedIfEmpty(): Promise<void> {
  const slotCount = await Slot.countDocuments();
  if (slotCount === 0) {
    console.log('ℹ️ Database is empty. Running initial auto-seed...');
    await seedDatabase(false);
  }
}

// Allow direct execution via CLI `npm run seed`
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase(true);
      await disconnectDB();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}
