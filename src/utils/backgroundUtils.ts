import { User, UserRole } from '../types';

/**
 * Exact 5-Image Role & Campus Background Assignment:
 * - Image 1 — ADMIN: /bg-admin.jpg
 * - Image 2 — SISTERS OF MARY BIGA: /bg-biga.jpg
 * - Image 3 — SISTERS OF MARY ADLAS: /bg-adlas.jpg
 * - Image 4 — SISTERS OF MARY TALISAY: /bg-talisay.jpg
 * - Image 5 — SISTERS OF MARY MINGLANILA: /bg-minglanilla.jpg
 */
export const SYSTEM_BACKGROUNDS = {
  ADMIN: '/bg-admin.jpg',
  BIGA: '/bg-biga.jpg',
  ADLAS: '/bg-adlas.jpg',
  TALISAY: '/bg-talisay.jpg',
  MINGLANILLA: '/bg-minglanilla.jpg',
} as const;

export type BackgroundSlotKey = keyof typeof SYSTEM_BACKGROUNDS;

/**
 * Automatically determines the assigned background image strictly from the
 * authenticated user's role and assigned campus.
 */
export function getAuthenticatedUserBackground(user: User | null): {
  slot: BackgroundSlotKey;
  imageUrl: string;
  assignmentLabel: string;
} {
  if (!user) {
    return {
      slot: 'ADMIN',
      imageUrl: '',
      assignmentLabel: '',
    };
  }

  // Image 1 — ADMIN
  if (user.role === UserRole.ADMIN) {
    return {
      slot: 'ADMIN',
      imageUrl: SYSTEM_BACKGROUNDS.ADMIN,
      assignmentLabel: 'Admin Account Background',
    };
  }

  const campusKey = (user.campusId || '').toUpperCase().trim();
  const campusNameLower = (user.campusName || '').toLowerCase().trim();

  // Image 2 — SISTERS OF MARY BIGA
  if (campusKey === 'BIGA' || campusNameLower.includes('biga')) {
    return {
      slot: 'BIGA',
      imageUrl: SYSTEM_BACKGROUNDS.BIGA,
      assignmentLabel: 'Sisters of Mary Biga Background',
    };
  }

  // Image 3 — SISTERS OF MARY ADLAS
  if (campusKey === 'ADLAS' || campusNameLower.includes('adlas')) {
    return {
      slot: 'ADLAS',
      imageUrl: SYSTEM_BACKGROUNDS.ADLAS,
      assignmentLabel: 'Sisters of Mary Adlas Background',
    };
  }

  // Image 4 — SISTERS OF MARY TALISAY
  if (campusKey === 'TALISAY' || campusNameLower.includes('talisay')) {
    return {
      slot: 'TALISAY',
      imageUrl: SYSTEM_BACKGROUNDS.TALISAY,
      assignmentLabel: 'Sisters of Mary Talisay Background',
    };
  }

  // Image 5 — SISTERS OF MARY MINGLANILA
  if (
    campusKey === 'MINGLANILLA' ||
    campusKey === 'MINGLANILA' ||
    campusNameLower.includes('minglanilla') ||
    campusNameLower.includes('minglanila')
  ) {
    return {
      slot: 'MINGLANILLA',
      imageUrl: SYSTEM_BACKGROUNDS.MINGLANILLA,
      assignmentLabel: 'Sisters of Mary Minglanila Background',
    };
  }

  return {
    slot: 'BIGA',
    imageUrl: SYSTEM_BACKGROUNDS.BIGA,
    assignmentLabel: 'Sisters of Mary Campus Background',
  };
}
