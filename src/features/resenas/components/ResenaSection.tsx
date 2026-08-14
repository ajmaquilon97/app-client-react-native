import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

import { makeStyles, useTheme } from '@/shared/theme';

import EscribirResenaForm from './EscribirResenaForm';
import MiResenaCard from './MiResenaCard';
import { useResenasEspacio, useReservasResenables } from '../hooks/useResenas';

interface ResenaSectionProps {
  espacioId: number;
  reservaId: number;
}

export default function ResenaSection({ espacioId, reservaId }: ResenaSectionProps) {
  const styles = useStyles();
  const { colors } = useTheme();

  const {
    data: resenas,
    isLoading: cargandoResenas,
    isError: errorResenas,
    refetch: refetchResenas,
  } = useResenasEspacio(espacioId);
  const {
    data: resenables,
    isLoading: cargandoResenables,
    isError: errorResenables,
    refetch: refetchResenables,
  } = useReservasResenables(espacioId);

  const cargando = cargandoResenas || cargandoResenables;
  const conError = errorResenas || errorResenables;
  const miResena = resenas?.find(r => r.reservaId === reservaId) ?? null;
  const puedeResenar = !miResena && !!resenables?.some(r => r.reservaId === reservaId);

  return (
    <View>
      <Text style={styles.sectionTitle}>Tu reseña</Text>

      {cargando ? (
        <View style={styles.infoBanner}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.infoBannerText}>Cargando…</Text>
        </View>
      ) : conError ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerText}>⚠️ No se pudo cargar la información de reseñas.</Text>
          <TouchableOpacity
            onPress={() => {
              refetchResenas();
              refetchResenables();
            }}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : miResena ? (
        <MiResenaCard espacioId={espacioId} resena={miResena} />
      ) : puedeResenar ? (
        <View style={styles.formCard}>
          <EscribirResenaForm espacioId={espacioId} reservaId={reservaId} />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Esta reserva ya no está disponible para reseñar.</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  sectionTitle: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: t.spacing.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
  },
  infoBannerText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
  },
  warningBanner: {
    backgroundColor: t.colors.errorSoft,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    gap: 4,
  },
  warningBannerText: {
    fontSize: t.fontSize.xs,
    color: t.colors.error,
    fontWeight: t.fontWeight.medium,
  },
  retryText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  formCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
  },
  emptyState: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
  },
  emptyText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
}));
