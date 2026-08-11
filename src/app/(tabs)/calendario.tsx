import React, { useMemo } from 'react';
import { View, Text, StatusBar, Platform, FlatList, TouchableOpacity, ActivityIndicator, Alert, ListRenderItemInfo } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarIcon } from '@/components/icons';
import { useMisReservas } from '@/hooks/useMisReservas';
import { useEspacios } from '@/hooks/useEspacios';
import { useAuth } from '@/context/AuthContext';
import { cancelarReserva } from '@/services/reservas.service';
import { reversarPagoDatafastDirecto, obtenerTransaccionDirecta } from '@/services/datafastDirectUat';
import { DATAFAST_DIAGNOSTICO_DIRECTO_UAT } from '@/config/paymentConfig';
import { formatRangoReserva } from '@/utils/fechas';
import { getModalidadReserva } from '@/utils/espacioArchetype';
import { EstadoReserva, Espacio, Reserva } from '@/types';
import { ColorToken, makeStyles, spacing, useTheme } from '@/theme';

const ESTADOS_CANCELABLES: EstadoReserva[] = ['pendiente', 'confirmada', 'reagendada'];
const ESTADOS_ACTIVOS: EstadoReserva[] = ['pendiente', 'confirmada', 'reagendada'];

const ESTADO_LABEL: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
};

// Guarda el nombre del token, no el color: el valor real depende del tema activo
// y solo se puede resolver dentro del componente.
const ESTADO_COLOR: Record<EstadoReserva, ColorToken> = {
  pendiente: 'star',
  confirmada: 'accent',
  reagendada: 'accent',
  cancelada: 'textMuted',
  finalizada: 'textMuted',
};

const IMAGEN_FALLBACK =
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';

export default function CalendarScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fetchAuthorized } = useAuth();
  const { data: reservas = [], isLoading, isError, refetch } = useMisReservas();
  const { data: espacios = [] } = useEspacios();

  const espaciosPorId = useMemo(() => {
    const map = new Map<number, (typeof espacios)[number]>();
    espacios.forEach(e => map.set(e.id, e));
    return map;
  }, [espacios]);

  const reservasActivas = reservas.filter(r => ESTADOS_ACTIVOS.includes(r.estado)).length;

  const handleCancelar = (reserva: Reserva) => {
    Alert.alert(
      'Cancelar reserva',
      `¿Seguro que quieres cancelar tu reserva en ${reserva.espacioTitulo}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            const motivo = 'Cancelado por el cliente desde la app';
            try {
              // El reverso del pago (si la reserva ya estaba paga) lo hace
              // backend automáticamente dentro de POST /{id}/cancelar — no es
              // un endpoint aparte, así que el cliente no tiene que orquestar
              // nada para el flujo real.
              //
              // ⚠️ Diagnóstico temporal: si el pago se hizo con
              // DATAFAST_DIAGNOSTICO_DIRECTO_UAT activo, nunca pasó por backend
              // (no hay nada que backend pueda reversar) — reversamos directo
              // contra Datafast con la transacción que quedó registrada en
              // memoria al pagar. Ver datafastDirectUat.ts.
              const transaccionDirecta = DATAFAST_DIAGNOSTICO_DIRECTO_UAT
                ? obtenerTransaccionDirecta(reserva.id)
                : undefined;

              if (__DEV__) {
                console.log('[Reversa] reserva.id:', reserva.id, 'estadoPago actual:', reserva.estadoPago);
                console.log(
                  transaccionDirecta
                    ? '[Reversa][BYPASS] reversando directo contra Datafast (pago se hizo sin backend)'
                    : '[Reversa][BACKEND] el reverso (si aplica) lo hace backend dentro de /cancelar',
                );
              }

              if (transaccionDirecta) {
                const resultado = await reversarPagoDatafastDirecto(
                  transaccionDirecta.transactionId,
                  transaccionDirecta.amount,
                );
                if (__DEV__) console.log('[Reversa][BYPASS] resultado:', resultado);
                if (!resultado.aprobado) {
                  throw new Error(resultado.mensaje || 'Datafast rechazó el reverso.');
                }
              }
              await fetchAuthorized(accessToken =>
                cancelarReserva(reserva.id, motivo, accessToken),
              );
              refetch();
            } catch (err) {
              Alert.alert(
                'No se pudo cancelar',
                err instanceof Error ? err.message : 'Intenta de nuevo.',
              );
            }
          },
        },
      ],
    );
  };

  const handleVerInvitados = (item: Reserva, espacio?: Espacio) => {
    router.push({
      pathname: '/reserva/[id]/invitados',
      params: {
        id: String(item.id),
        titulo: item.espacioTitulo,
        ...(espacio?.maxCapacidad != null ? { maxCapacidad: String(espacio.maxCapacidad) } : {}),
      },
    });
  };

  const handleVerDetalle = (item: Reserva) => {
    router.push({
      pathname: '/reserva/[id]/detalle',
      params: { id: String(item.id), titulo: item.espacioTitulo },
    });
  };

  const renderReserva = ({ item }: ListRenderItemInfo<Reserva>) => {
    const espacio = espaciosPorId.get(item.espacioId);
    const esCancelable = ESTADOS_CANCELABLES.includes(item.estado);
    const esCupoCompartido = !!espacio && getModalidadReserva(espacio) === 'cupo_compartido';
    const puedeVerInvitados =
      item.estadoPago === 'pagado' && item.estado !== 'cancelada' && !!espacio?.validarAforo;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => handleVerDetalle(item)}>
        <Image
          source={{ uri: espacio?.imagen ?? IMAGEN_FALLBACK }}
          style={styles.cardImage}
          contentFit="cover"
        />
        <View style={styles.cardBody}>
          <View>
            {!!espacio?.subcategoria && (
              <Text style={styles.cardSubcat}>{espacio.subcategoria}</Text>
            )}
            <Text style={styles.cardName} numberOfLines={1}>
              {item.espacioTitulo}
            </Text>
            <View style={styles.cardMetaRow}>
              <CalendarIcon size={13} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.cardFecha}>
                {formatRangoReserva(item.fechaInicio, item.fechaFin)}
              </Text>
            </View>
            <Text style={styles.cardCodigo}>
              {item.codigo ?? `Reserva #${String(item.id).padStart(6, '0')}`}
            </Text>
            <Text style={styles.cardDetail}>
              {esCupoCompartido
                ? `${item.pax} entrada${item.pax !== 1 ? 's' : ''}`
                : `${item.totalHoras} hora${item.totalHoras !== 1 ? 's' : ''}`}
              {'   |   '}Total:{' '}
              <Text style={styles.cardDetailBold}>
                ${(item.pago.total ?? 0).toFixed(2)}
              </Text>
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.cardEstado, { color: colors[ESTADO_COLOR[item.estado]] }]}>
              {ESTADO_LABEL[item.estado]}
            </Text>
            <View style={styles.cardFooterActions}>
              {puedeVerInvitados && (
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleVerInvitados(item, espacio)}>
                  <Text style={styles.cardInvitados}>Invitados</Text>
                </TouchableOpacity>
              )}
              {esCancelable && (
                <TouchableOpacity activeOpacity={0.7} onPress={() => handleCancelar(item)}>
                  <Text style={styles.cardCancel}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Mis Reservas</Text>
            <Text style={styles.headerSubtitle}>Tus reservas y disponibilidad</Text>
          </View>
          {reservasActivas > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reservasActivas} Activas</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isError ? (
        <View style={styles.content}>
          <Text style={styles.title}>No se pudieron cargar tus reservas</Text>
          <TouchableOpacity activeOpacity={0.85} style={styles.exploreBtn} onPress={() => refetch()}>
            <Text style={styles.exploreBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : reservas.length > 0 ? (
        <FlatList
          data={reservas}
          renderItem={renderReserva}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <CalendarIcon size={44} color={colors.borderStrong} strokeWidth={1.5} />
          </View>
          <Text style={styles.title}>Sin reservas</Text>
          <Text style={styles.subtitle}>
            No tienes ninguna reserva agendada en este momento. Explora los espacios
            disponibles y reserva el que más te guste.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.exploreBtn}
            onPress={() => router.navigate('/')}>
            <Text style={styles.exploreBtnText}>Explorar Espacios</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
    borderBottomLeftRadius: t.radius.xxl + 4,
    borderBottomRightRadius: t.radius.xxl + 4,
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: t.colors.headerText,
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: t.colors.headerTextMuted,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.medium,
  },
  badge: {
    backgroundColor: t.colors.accent,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  badgeText: {
    color: t.colors.onAccent,
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
  },
  listContent: {
    padding: t.spacing.lg,
    gap: t.spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    padding: t.spacing.md,
    gap: t.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: t.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: t.radius.lg,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardSubcat: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginTop: 1,
  },
  cardCodigo: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    fontWeight: t.fontWeight.medium,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cardFecha: {
    fontSize: t.fontSize.xs,
    color: t.colors.textPrimary,
    fontWeight: t.fontWeight.semiBold,
  },
  cardDetail: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    marginTop: 4,
  },
  cardDetailBold: {
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
    paddingTop: t.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderSubtle,
  },
  cardEstado: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardCancel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.favorite,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardFooterActions: {
    flexDirection: 'row',
    gap: t.spacing.md,
  },
  cardInvitados: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.xxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.xl,
  },
  title: {
    fontSize: t.fontSize.xxl,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: t.fontSize.base,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: t.spacing.xl,
  },
  exploreBtn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm + 2,
    paddingHorizontal: t.spacing.xxl,
  },
  exploreBtnText: {
    color: t.colors.onPrimary,
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
  },
}));
