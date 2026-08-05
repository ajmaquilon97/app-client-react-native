import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CalendarIcon } from '@/components/icons';
import { useMisReservas } from '@/hooks/useMisReservas';
import { useEspacios } from '@/hooks/useEspacios';
import { useAuth } from '@/context/AuthContext';
import { cancelarReserva } from '@/services/reservas.service';
import { reversarPagoDatafastDirecto, obtenerTransaccionDirecta } from '@/services/datafastDirectUat';
import { DATAFAST_DIAGNOSTICO_DIRECTO_UAT } from '@/config/paymentConfig';
import { formatRangoReserva } from '@/utils/fechas';
import { getModalidadReserva } from '@/utils/espacioArchetype';
import { EstadoReserva, Reserva } from '@/types';

const ESTADOS_CANCELABLES: EstadoReserva[] = ['pendiente', 'confirmada', 'reagendada'];
const ESTADOS_ACTIVOS: EstadoReserva[] = ['pendiente', 'confirmada', 'reagendada'];

const ESTADO_LABEL: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  reagendada: 'Reagendada',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
};

const ESTADO_COLOR: Record<EstadoReserva, string> = {
  pendiente: Colors.amber,
  confirmada: Colors.accentTeal,
  reagendada: Colors.accentTeal,
  cancelada: Colors.gray400,
  finalizada: Colors.gray400,
};

const IMAGEN_FALLBACK =
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80';

export default function CalendarScreen() {
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

  const renderReserva = ({ item }: ListRenderItemInfo<Reserva>) => {
    const espacio = espaciosPorId.get(item.espacioId);
    const esCancelable = ESTADOS_CANCELABLES.includes(item.estado);
    const esCupoCompartido = !!espacio && getModalidadReserva(espacio) === 'cupo_compartido';

    return (
      <View style={styles.card}>
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
              <CalendarIcon size={13} color={Colors.gray400} strokeWidth={2} />
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
            <Text style={[styles.cardEstado, { color: ESTADO_COLOR[item.estado] }]}>
              {ESTADO_LABEL[item.estado]}
            </Text>
            {esCancelable && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleCancelar(item)}>
                <Text style={styles.cardCancel}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
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
          <ActivityIndicator size="large" color={Colors.accentTeal} />
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
            <CalendarIcon size={44} color={Colors.gray300} strokeWidth={1.5} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xxl + 4,
    borderBottomRightRadius: BorderRadius.xxl + 4,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
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
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: Colors.teal200,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  badge: {
    backgroundColor: Colors.accentTeal,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
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
    borderRadius: BorderRadius.lg,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardSubcat: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.accentTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginTop: 1,
  },
  cardCodigo: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cardFecha: {
    fontSize: FontSize.xs,
    color: Colors.gray700,
    fontWeight: FontWeight.semiBold,
  },
  cardDetail: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginTop: 4,
  },
  cardDetailBold: {
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cardEstado: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardCancel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.rose,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  exploreBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xxl,
  },
  exploreBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
});
