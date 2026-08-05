import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { ArrowLeftIcon } from '@/components/icons';
import { useInvitados, invitadosQueryKey } from '@/hooks/useInvitados';
import InvitadoRow from '@/components/invitados/InvitadoRow';
import AsignarInvitadosForm from '@/components/invitados/AsignarInvitadosForm';
import { Invitado } from '@/types';

export default function InvitadosScreen() {
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
          <ArrowLeftIcon size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {titulo || 'Invitados'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      <FlatList
        data={invitados}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
        renderItem={({ item }) => <InvitadoRow reservaId={reservaId} invitado={item} onUpdated={handleUpdated} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.xs }} />}
        ListHeaderComponent={
          isLoading ? (
            <View style={styles.infoBanner}>
              <ActivityIndicator size="small" color={Colors.gray500} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
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
    padding: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    marginHorizontal: Spacing.sm,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoBannerText: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
  },
  warningBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  warningBannerText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  retryText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xxs,
  },
  emptyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  emptyText: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});
