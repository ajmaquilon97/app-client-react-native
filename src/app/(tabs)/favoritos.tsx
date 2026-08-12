import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StatusBar, Platform, ListRenderItemInfo, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Espacio } from '@/types';
import { useFavoriteSpaces, useEspaciosPorIds } from '@/hooks/useFilteredSpaces';
import {
  CrearListaModal,
  SaveToListSheet,
  useEliminarLista,
  useEsFavorito,
  useFavoritos,
  useListaFavoritosDetalle,
  useListasFavoritos,
  useQuitarDeLista,
  useToggleFavorito,
  type ListaFavoritos,
} from '@/features/favoritos';
import SpaceCard from '@/components/home/SpaceCard';
import SpaceDetailSheet from '@/components/space/SpaceDetailSheet';
import { HeartIcon, PlusIcon } from '@/shared/ui/icons';
import { makeStyles, spacing, useTheme } from '@/shared/theme';

export default function FavoritesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: favorites = [] } = useFavoritos();
  const isFavorite = useEsFavorito();
  const toggle = useToggleFavorito();
  const quitarDeLista = useQuitarDeLista();
  const eliminarLista = useEliminarLista();
  const favoriteSpaces = useFavoriteSpaces(favorites);

  const { data: listas = [] } = useListasFavoritos();
  const [listaSeleccionada, setListaSeleccionada] = useState<number | null>(null);
  const { data: listaDetalle, isLoading: listaLoading } = useListaFavoritosDetalle(listaSeleccionada);
  const listaEspacios = useEspaciosPorIds(listaDetalle?.espacioIds ?? []);

  const [espacioDetalle, setEspacioDetalle] = useState<Espacio | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [guardarEnListaId, setGuardarEnListaId] = useState<number | null>(null);
  const [crearListaVisible, setCrearListaVisible] = useState(false);

  const espaciosMostrados = listaSeleccionada == null ? favoriteSpaces : listaEspacios;
  const cargandoLista = listaSeleccionada != null && listaLoading;

  const handleCardPress = useCallback((espacio: Espacio) => {
    setEspacioDetalle(espacio);
    setSheetVisible(true);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    setEspacioDetalle(null);
  }, []);

  // En esta pantalla todo lo que se ve ya es favorito, así que tocar el
  // corazón siempre "quita" — de todas las listas si se ve "Todos", o solo de
  // la lista actual si hay una seleccionada (ver docs/backend_response/
  // favoritos-listas-response.md §2, nota sobre el botón "quitar" con listaId).
  const toggleFavorite = useCallback(
    (espacioId: number) => toggle.mutate({ espacioId, esFavorito: isFavorite(espacioId) }),
    [toggle, isFavorite],
  );

  const handleQuitarFavorito = useCallback(
    (espacioId: number) => {
      if (listaSeleccionada == null) {
        toggleFavorite(espacioId);
        return;
      }
      quitarDeLista.mutate({ espacioId, listaId: listaSeleccionada });
    },
    [listaSeleccionada, toggleFavorite, quitarDeLista],
  );

  const handleListaCreada = useCallback((lista: ListaFavoritos) => {
    setCrearListaVisible(false);
    setListaSeleccionada(lista.id);
  }, []);

  const handleEliminarLista = useCallback(
    (lista: ListaFavoritos) => {
      Alert.alert(
        `¿Eliminar "${lista.nombre}"?`,
        'Los espacios que solo estén guardados en esta lista dejarán de aparecer en tus favoritos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () =>
              eliminarLista.mutate(lista.id, {
                onSuccess: () => {
                  if (listaSeleccionada === lista.id) setListaSeleccionada(null);
                },
                onError: err =>
                  Alert.alert(
                    'No se pudo eliminar la lista',
                    err.message || 'Intenta de nuevo.',
                  ),
              }),
          },
        ],
      );
    },
    [eliminarLista, listaSeleccionada],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Espacio>) => (
      <SpaceCard
        espacio={item}
        isFavorite={isFavorite(item.id)}
        onPress={handleCardPress}
        onToggleFavorite={handleQuitarFavorito}
        onLongPressFavorite={setGuardarEnListaId}
      />
    ),
    [isFavorite, handleCardPress, handleQuitarFavorito],
  );

  const keyExtractor = useCallback((item: Espacio) => String(item.id), []);

  const subtitulo = useMemo(() => {
    if (listaSeleccionada == null) {
      return `${favorites.length} espacio${favorites.length !== 1 ? 's' : ''} guardado${favorites.length !== 1 ? 's' : ''}`;
    }
    const nombreLista = listas.find(l => l.id === listaSeleccionada)?.nombre ?? '';
    return nombreLista;
  }, [listaSeleccionada, favorites.length, listas]);

  const ListEmptyComponent = cargandoLista ? (
    <View style={styles.emptyContainer}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  ) : (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <HeartIcon size={32} color={colors.borderStrong} />
      </View>
      <Text style={styles.emptyTitle}>
        {listaSeleccionada == null ? 'Sin favoritos aún' : 'Esta lista está vacía'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {listaSeleccionada == null
          ? 'Guarda espacios que te interesen tocando el corazón en cada tarjeta.'
          : 'Mantén presionado el corazón de un espacio para guardarlo aquí.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent={false}
      />

      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Mis Favoritos</Text>
        <Text style={styles.headerSubtitle}>{subtitulo}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.chip, listaSeleccionada == null && styles.chipActive]}
          onPress={() => setListaSeleccionada(null)}>
          <Text
            style={[styles.chipText, listaSeleccionada == null && styles.chipTextActive]}
            numberOfLines={1}>
            Todos
          </Text>
          <Text style={[styles.chipCount, listaSeleccionada == null && styles.chipCountActive]}>
            {favorites.length}
          </Text>
        </TouchableOpacity>

        {listas.map(lista => {
          const activa = listaSeleccionada === lista.id;
          return (
            <TouchableOpacity
              key={lista.id}
              activeOpacity={0.8}
              style={[styles.chip, activa && styles.chipActive]}
              onPress={() => setListaSeleccionada(lista.id)}
              onLongPress={() => handleEliminarLista(lista)}>
              <Text style={[styles.chipText, activa && styles.chipTextActive]} numberOfLines={1}>
                {lista.nombre}
              </Text>
              <Text style={[styles.chipCount, activa && styles.chipCountActive]}>
                {lista.cantidadEspacios}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.chip}
          onPress={() => setCrearListaVisible(true)}>
          <PlusIcon size={16} color={colors.accent} strokeWidth={2.5} />
          <Text style={styles.chipText} numberOfLines={1}>
            Nueva
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={espaciosMostrados}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <SpaceDetailSheet
        visible={sheetVisible}
        espacio={espacioDetalle}
        isFavorite={espacioDetalle ? isFavorite(espacioDetalle.id) : false}
        onToggleFavorite={toggleFavorite}
        onClose={handleSheetClose}
      />

      <SaveToListSheet
        visible={guardarEnListaId != null}
        espacioId={guardarEnListaId}
        onClose={() => setGuardarEnListaId(null)}
      />

      <CrearListaModal
        visible={crearListaVisible}
        onClose={() => setCrearListaVisible(false)}
        onCreated={handleListaCreada}
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
  chipsRow: {
    flexDirection: 'row',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  // Cuadritos de tamaño fijo — mismo ancho/alto para "Todos", cada lista y
  // "Nueva", sin que el contenido cambie la forma del botón.
  chip: {
    width: 76,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.xxs,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  chipActive: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  chipText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  chipTextActive: {
    color: t.colors.onAccent,
  },
  chipCount: {
    fontSize: t.fontSize.xxs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textMuted,
    marginTop: 2,
  },
  chipCountActive: {
    color: t.colors.onAccent,
  },
  listContent: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.xl,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: t.spacing.xxxl * 2,
    paddingHorizontal: t.spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.md,
  },
  emptyTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: t.fontSize.base,
    color: t.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
}));
