import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from '@/components/icons';
import { useInvitados, invitadosQueryKey } from '@/hooks/useInvitados';
import InvitadoRow from '@/components/invitados/InvitadoRow';
import AsignarInvitadosForm from '@/components/invitados/AsignarInvitadosForm';
import { Invitado } from '@/types';
import { makeStyles, spacing, useTheme } from '@/theme';

export default function InvitadosScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id, titulo, maxCapacidad } = useLocalSearchParams<{
    id: string;
    titulo?: string;
    maxCapacidad?: string;
  }>();
  const reservaId = Number(id);

  const { data: invitados = [], isLoading, isError, refetch } = useInvitados(reservaId);

  const disponibleEstimado = useMemo(() => {
    if (!maxCapacidad) return null;
    const total = Number(maxCapacidad);
    if (!Number.isFinite(total)) return null;
    return Math.max(0, total - invitados.length);
  }, [maxCapacidad, invitados.length]);

  const handleUpdated = (actualizado: Invitado) => {
    queryClient.setQueryData<Invitado[]>(invitadosQueryKey(reservaId), prev =>
      prev ? prev.map(i => (i.id === actualizado.id ? actualizado : i)) : prev,
    );
  };

  const handleAsignados = () => {
    queryClient.invalidateQueries({ queryKey: invitadosQueryKey(reservaId) });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeftIcon size={20} color={colors.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {titulo || 'Invitados'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <FlatList
        data={invitados}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xxxl }]}
        renderItem={({ item }) => <InvitadoRow reservaId={reservaId} invitado={item} onUpdated={handleUpdated} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        ListHeaderComponent={
          isLoading ? (
            <View style={styles.infoBanner}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={styles.infoBannerText}>Cargando invitados…</Text>
            </View>
          ) : isError ? (
            <View style={styles.warningBanner}>
              <Text style={styles.warningBannerText}>⚠️ No se pudieron cargar los invitados.</Text>
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Todavía no tienes invitados</Text>
              <Text style={styles.emptyText}>
                Agrega a las personas que van a acompañarte para enviarles su entrada por correo.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          !isLoading && !isError ? (
            <View style={styles.formCard}>
              <AsignarInvitadosForm
                reservaId={reservaId}
                disponibleEstimado={disponibleEstimado}
                onAsignados={handleAsignados}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  headerBtn: {
    width: 36,
    height: 36,
    padding: t.spacing.xs,
    backgroundColor: t.colors.overlayWhite,
    borderRadius: t.radius.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: t.colors.textInverse,
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    marginHorizontal: t.spacing.sm,
  },
  listContent: {
    padding: t.spacing.lg,
    gap: t.spacing.xs,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
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
    marginBottom: t.spacing.sm,
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
  emptyState: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.lg,
    alignItems: 'center',
    marginBottom: t.spacing.sm,
    gap: t.spacing.xxs,
  },
  emptyTitle: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
  },
  emptyText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    marginTop: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
  },
}));
