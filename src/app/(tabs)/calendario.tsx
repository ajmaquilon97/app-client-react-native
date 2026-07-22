import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { CalendarIcon } from '@/components/icons';
import { useReservationsContext, Reserva } from '@/context/ReservationsContext';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { reservas, reservasCount, cancelReserva } = useReservationsContext();

  const renderReserva = ({ item }: ListRenderItemInfo<Reserva>) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.espacio.imagen }}
        style={styles.cardImage}
        contentFit="cover"
      />
      <View style={styles.cardBody}>
        <View>
          <Text style={styles.cardSubcat}>{item.espacio.subcategoria}</Text>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.espacio.nombre}
          </Text>
          <View style={styles.cardMetaRow}>
            <CalendarIcon size={13} color={Colors.gray400} strokeWidth={2} />
            <Text style={styles.cardFecha}>{item.fecha}</Text>
          </View>
          <Text style={styles.cardDetail}>
            Cantidad: <Text style={styles.cardDetailBold}>{item.cantidad}</Text>
            {'   |   '}Total:{' '}
            <Text style={styles.cardDetailBold}>${item.total.toFixed(2)}</Text>
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardCodigo}>{item.codigo}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => cancelReserva(item.id)}>
            <Text style={styles.cardCancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
          {reservasCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reservasCount} Activas</Text>
            </View>
          )}
        </View>
      </View>

      {reservasCount > 0 ? (
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
  cardCodigo: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: FontWeight.medium,
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
