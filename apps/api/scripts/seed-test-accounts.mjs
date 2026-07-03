import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const password = 'Senha123!';

const shouldRun = process.env.SEED_TEST_ACCOUNTS === 'true' || process.argv.includes('--force');

if (!shouldRun) {
  console.log('SEED_TEST_ACCOUNTS diferente de true. Seed de contas de teste ignorado.');
  process.exit(0);
}

async function upsertTrainer({ fullName, email }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      passwordHash,
      role: 'TRAINER',
      isActive: true,
      emailVerifiedAt: now,
      mustChangePassword: false,
      temporaryPasswordExpiresAt: null,
      temporaryPasswordUsedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastPasswordChangeAt: now
    },
    create: {
      fullName,
      email,
      passwordHash,
      role: 'TRAINER',
      isActive: true,
      emailVerifiedAt: now,
      mustChangePassword: false,
      lastPasswordChangeAt: now
    }
  });

  await prisma.coachSettings.upsert({
    where: { coachId: user.id },
    update: {},
    create: { coachId: user.id }
  });

  return user;
}

async function upsertAthlete({ fullName, email, coachId, birthDate, sex, weightCategory }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const [firstName, ...lastNameParts] = fullName.split(' ');
  const lastName = lastNameParts.join(' ') || 'Teste';

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      passwordHash,
      role: 'ATHLETE',
      isActive: true,
      emailVerifiedAt: now,
      mustChangePassword: false,
      temporaryPasswordExpiresAt: null,
      temporaryPasswordUsedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      firstLoginAt: now,
      lastPasswordChangeAt: now
    },
    create: {
      fullName,
      email,
      passwordHash,
      role: 'ATHLETE',
      isActive: true,
      emailVerifiedAt: now,
      mustChangePassword: false,
      firstLoginAt: now,
      lastPasswordChangeAt: now
    }
  });

  await prisma.athlete.upsert({
    where: { userId: user.id },
    update: {
      coachId,
      firstName,
      lastName,
      birthDate,
      sex,
      weightCategory,
      competitiveLevel: 'BEGINNER',
      gym: 'LVM Weightlifting',
      profileStatus: 'PROFILE_COMPLETE',
      profileCompletedAt: now,
      isActive: true,
      deactivatedAt: null,
      deactivationReason: null
    },
    create: {
      userId: user.id,
      coachId,
      firstName,
      lastName,
      birthDate,
      sex,
      weightCategory,
      competitiveLevel: 'BEGINNER',
      gym: 'LVM Weightlifting',
      profileStatus: 'PROFILE_COMPLETE',
      profileCompletedAt: now,
      isActive: true
    }
  });

  return user;
}

async function main() {
  const trainer1 = await upsertTrainer({ fullName: 'Treinador 1', email: 'treinador1@teste.local' });
  const trainer2 = await upsertTrainer({ fullName: 'Treinador 2', email: 'treinador2@teste.local' });

  await upsertAthlete({
    fullName: 'Aluno 1',
    email: 'aluno1@teste.local',
    coachId: trainer1.id,
    birthDate: new Date('2000-01-01'),
    sex: 'MALE',
    weightCategory: '85 kg'
  });
  await upsertAthlete({
    fullName: 'Aluno 2',
    email: 'aluno2@teste.local',
    coachId: trainer1.id,
    birthDate: new Date('2001-02-02'),
    sex: 'FEMALE',
    weightCategory: '69 kg'
  });
  await upsertAthlete({
    fullName: 'Aluno 3',
    email: 'aluno3@teste.local',
    coachId: trainer2.id,
    birthDate: new Date('2002-03-03'),
    sex: 'MALE',
    weightCategory: '95 kg'
  });
  await upsertAthlete({
    fullName: 'Aluno 4',
    email: 'aluno4@teste.local',
    coachId: trainer2.id,
    birthDate: new Date('2003-04-04'),
    sex: 'FEMALE',
    weightCategory: '57 kg'
  });

  const createdUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'treinador1@teste.local',
          'treinador2@teste.local',
          'aluno1@teste.local',
          'aluno2@teste.local',
          'aluno3@teste.local',
          'aluno4@teste.local'
        ]
      }
    },
    orderBy: { email: 'asc' },
    select: {
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      athleteProfile: {
        select: {
          profileStatus: true,
          isActive: true,
          coach: { select: { email: true } }
        }
      }
    }
  });

  console.log(JSON.stringify(createdUsers, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
