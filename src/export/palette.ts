import { colors } from '../theme/theme'
import type { ExportPalette } from './types'

// The one place theme tokens become an export palette. Every template takes an ExportPalette
// prop and reads only from it, so this file is the entire surface a future dark-export choice
// would touch.
export const LIGHT_EXPORT_PALETTE: ExportPalette = {
  background: colors.background,
  surface: colors.surface,
  surfaceSunken: colors.surfaceSunken,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  border: colors.border,
  borderSubtle: colors.borderSubtle,
  accent: colors.primary,
  block: {
    'warm-up': { base: colors.block.warmup, tint: colors.block.warmupTint },
    technical: { base: colors.block.technical, tint: colors.block.technicalTint },
    possession: { base: colors.block.possession, tint: colors.block.possessionTint },
    pressing: { base: colors.block.pressing, tint: colors.block.pressingTint },
    attacking: { base: colors.block.attacking, tint: colors.block.attackingTint },
    defending: { base: colors.block.defending, tint: colors.block.defendingTint },
    transition: { base: colors.block.transition, tint: colors.block.transitionTint },
    game: { base: colors.block.game, tint: colors.block.gameTint },
  },
}
