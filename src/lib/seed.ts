import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const ADMIN_LOGIN_ID = 'lucian1975'
const ADMIN_PASSWORD = 'PASSWORD@@1975'

export async function ensureSeed() {
  const count = await db.user.count()
  if (count > 0) return

  // Create the admin account only. No demo novels, characters, or mock data.
  const admin = await db.user.create({
    data: {
      loginId: ADMIN_LOGIN_ID,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      displayName: 'Lucian',
      role: 'ADMIN',
      voiceEnabled: true,
      ageVerified: true,
      hiddenModeUnlocked: true,
      bio: 'Sovereign administrator of L-C.',
    },
  })

  // Provision default settings for the admin
  const existingSettings = await db.userSettings.findUnique({ where: { userId: admin.id } })
  if (!existingSettings) {
    await db.userSettings.create({ data: { userId: admin.id } })
  }

  // Create "The Hub" — the permanent global community showroom
  const existingHub = await db.hub.findFirst({ where: { isTheHub: true } })
  if (!existingHub) {
    await db.hub.create({
      data: {
        name: 'The Hub',
        avatarInitial: '⌘',
        isTheHub: true,
        ownerId: admin.id,
        members: {
          create: [{ userId: admin.id, role: 'admin' }],
        },
        messages: {
          create: [
            {
              senderId: admin.id,
              content: 'Welcome to The Hub. A place where writers gather to ask questions, share ideas, receive feedback, and help each other create unforgettable stories. Community for every writer.',
              isSystemLog: true,
            },
          ],
        },
      },
    })
  }
}
