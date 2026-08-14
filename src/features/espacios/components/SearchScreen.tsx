import React, { useRef, useCallback, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Platform, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Espacio } from '../types';
import { useEspacios } from '@/features/espacios';
import { ArrowLeftIcon, SearchIcon, CloseCircleIcon, StarIcon, LocationIcon } from '@/shared/ui/icons';
import { makeStyles, useTheme } from '@/shared/theme';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface EspacioConCoincidencia extends Espacio {
  coincidenciaPorcentaje: number;
}

interface ResultadoBusqueda {
  exactas: Espacio[];
  aproximadas: EspacioConCoincidencia[];
  esFuzzyMode: boolean;
}

// ─── Algoritmo fuzzy ─────────────────────────────────────────────────────────

function calcularCoincidenciasFuzzy(query: string, espacios: Espacio[]): ResultadoBusqueda {
  if (!query.trim()) return { exactas: [], aproximadas: [], esFuzzyMode: false };

  const queryLimpia = query.toLowerCase().trim();
  const tokens = queryLimpia.split(/\s+/).filter(w => w.length > 1);

  const exactas = espacios.filter(e => {
    const campo = `${e.nombre} ${e.subcategoria} ${e.ubicacion} ${e.descripcion}`.toLowerCase();
    return campo.includes(queryLimpia);
  });

  const aproximadas: EspacioConCoincidencia[] = espacios.map(e => {
    let score = 0;
    const campo = `${e.nombre} ${e.categoria} ${e.subcategoria} ${e.ubicacion} ${e.descripcion}`.toLowerCase();

    tokens.forEach(token => {
      if (campo.includes(token)) {
        score += 10;
        if (e.nombre.toLowerCase().includes(token)) score += 10;
        if (e.categoria.toLowerCase().includes(token)) score += 8;
        if (e.subcategoria.toLowerCase().includes(token)) score += 8;
      }
    });

    const maxScore = tokens.length * 20;
    const coincidenciaPorcentaje = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;
    return { ...e, coincidenciaPorcentaje };
  })
    .filter(e => e.coincidenciaPorcentaje > 0)
    .sort((a, b) => b.coincidenciaPorcentaje - a.coincidenciaPorcentaje);

  return { exactas, aproximadas, esFuzzyMode: exactas.length === 0 };
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const SUGERENCIAS = ['Fútbol', 'Tenis', 'Piscina', 'Salón', 'Urdesa', 'Cumpleaños', 'Norte', 'Costa', 'Bodas', 'Arcilla', 'Familiar'];

// ─── Props ───────────────────────────────────────────────────────────────────

interface SearchScreenProps {
  visible: boolean;
  busqueda: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSelectEspacio: (espacio: Espacio) => void;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function SearchScreen({
  visible,
  busqueda,
  onChangeText,
  onClose,
  onSelectEspacio,
}: SearchScreenProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [pantallaSugeridos, setPantallaSugeridos] = useState(false);
  const { data: espacios = [] } = useEspacios();

  const { exactas, aproximadas, esFuzzyMode } = useMemo(
    () => calcularCoincidenciasFuzzy(busqueda, espacios),
    [busqueda, espacios],
  );

  // Lista principal: resultados exactos si los hay, fuzzy si no
  const resultados = busqueda.trim() ? (esFuzzyMode ? [] : exactas) : [];
  const hayTexto = busqueda.trim().length > 0;

  const handleClose = useCallback(() => {
    onChangeText('');
    setPantallaSugeridos(false);
    onClose();
  }, [onChangeText, onClose]);

  const handleSelectEspacio = useCallback((espacio: Espacio) => {
    setPantallaSugeridos(false);
    onClose();
    onSelectEspacio(espacio);
  }, [onClose, onSelectEspacio]);

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>

      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.backButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ArrowLeftIcon size={20} color={colors.headerText} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Buscar Espacio</Text>
          </View>

          <View style={styles.inputContainer}>
            <SearchIcon size={18} color={colors.headerTextMuted} />
            <TextInput
              ref={inputRef}
              value={busqueda}
              onChangeText={onChangeText}
              placeholder="Escribe para buscar..."
              placeholderTextColor={colors.headerTextSubtle}
              style={styles.input}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              selectionColor={colors.accent}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity
                onPress={() => onChangeText('')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CloseCircleIcon size={18} color={colors.headerTextSubtle} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Cuerpo ── */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {!hayTexto ? (
            /* Estado vacío: sugerencias */
            <View>
              <Text style={styles.sectionLabel}>Sugerencias populares</Text>
              <View style={styles.tagsRow}>
                {SUGERENCIAS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => onChangeText(tag)}
                    style={styles.tag}
                    activeOpacity={0.8}>
                    <Text style={styles.tagText}>🏷️ {tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.hintCard}>
                <Text style={styles.hintEmoji}>📍</Text>
                <View style={styles.hintText}>
                  <Text style={styles.hintTitle}>Búsqueda inteligente</Text>
                  <Text style={styles.hintDesc}>
                    Escribe palabras clave o descripciones generales y nuestro algoritmo encontrará los espacios más compatibles.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* Estado con texto */
            <View>

              {/* Banner "Buscar: X" — siempre visible al escribir */}
              <TouchableOpacity
                style={styles.buscarBanner}
                activeOpacity={0.85}
                onPress={() => setPantallaSugeridos(true)}>
                <Text style={styles.buscarBannerText}>
                  Buscar: <Text style={styles.buscarBannerQuery}>&ldquo;{busqueda}&rdquo;</Text>
                </Text>
                <Text style={styles.buscarBannerArrow}>➔</Text>
              </TouchableOpacity>

              {/* Contador */}
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsLabel}>Resultados para &ldquo;{busqueda}&rdquo;</Text>
                <Text style={styles.resultsCount}>{resultados.length} encontrados</Text>
              </View>

              {resultados.length > 0 ? (
                resultados.map(espacio => (
                  <ResultCard
                    key={espacio.id}
                    espacio={espacio}
                    onPress={handleSelectEspacio}
                  />
                ))
              ) : (
                /* Sin coincidencias exactas → invitar a fuzzy */
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Sin coincidencias exactas</Text>
                  <Text style={styles.emptyDesc}>
                    Toca el banner de arriba para ver los espacios más similares a tu búsqueda.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

      </View>
    </Modal>

    {/* ── Modal independiente: Lugares Sugeridos ── */}
    <Modal
      visible={pantallaSugeridos}
      animationType="slide"
      onRequestClose={() => setPantallaSugeridos(false)}
      statusBarTranslucent>

      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.container}>

        {/* Header sugeridos */}
        <View style={[styles.sugeridosHeader, { paddingTop: insets.top }]}>
          <View style={styles.sugeridosHeaderLeft}>
            <TouchableOpacity
              onPress={() => setPantallaSugeridos(false)}
              style={styles.backButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ArrowLeftIcon size={20} color={colors.headerText} strokeWidth={2.5} />
            </TouchableOpacity>
            <View>
              <Text style={styles.sugeridosTitle}>Lugares Sugeridos</Text>
              <Text style={styles.sugeridosSubtitle}>Búsqueda: &ldquo;{busqueda}&rdquo;</Text>
            </View>
          </View>
          <View style={styles.fuzzyBadge}>
            <Text style={styles.fuzzyBadgeText}>Fuzzy Match</Text>
          </View>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Explicación del algoritmo */}
          <View style={styles.algorithmCard}>
            <Text style={styles.algorithmTitle}>🔍 Algoritmo de Coincidencias</Text>
            <Text style={styles.algorithmDesc}>
              Mostrando todos los espacios que comparten palabras o características con{' '}
              <Text style={styles.algorithmQuery}>&ldquo;{busqueda}&rdquo;</Text>, ordenados de mayor a menor relevancia.
            </Text>
          </View>

          {aproximadas.length > 0 ? (
            aproximadas.map(espacio => (
              <FuzzyCard
                key={espacio.id}
                espacio={espacio}
                onPress={handleSelectEspacio}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sin coincidencias</Text>
              <Text style={styles.emptyDesc}>
                No logramos enlazar tu búsqueda con ningún espacio del catálogo.
              </Text>
            </View>
          )}
        </ScrollView>

      </View>
    </Modal>
    </>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function ResultCard({ espacio, onPress }: { espacio: Espacio; onPress: (e: Espacio) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.85}
      onPress={() => onPress(espacio)}>
      <Image source={{ uri: espacio.imagen }} style={styles.resultImage} contentFit="cover" />
      <View style={styles.resultInfo}>
        <View style={styles.resultTopRow}>
          <Text style={styles.resultSubcat}>{espacio.subcategoria}</Text>
          <View style={styles.ratingRow}>
            <StarIcon size={12} color={colors.star} />
            <Text style={styles.ratingText}>{espacio.rating}</Text>
          </View>
        </View>
        <Text style={styles.resultNombre} numberOfLines={1}>{espacio.nombre}</Text>
        <View style={styles.resultBottomRow}>
          <View style={styles.distanciaRow}>
            <LocationIcon size={12} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.distanciaText}>a {espacio.distancia} km</Text>
          </View>
          <Text style={styles.precioText}>
            ${espacio.precio} <Text style={styles.unidadText}>/{espacio.unidad}</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FuzzyCard({ espacio, onPress }: { espacio: EspacioConCoincidencia; onPress: (e: Espacio) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={styles.fuzzyCard}
      activeOpacity={0.85}
      onPress={() => onPress(espacio)}>
      <View style={styles.fuzzyImageContainer}>
        <Image source={{ uri: espacio.imagen }} style={styles.fuzzyImage} contentFit="cover" />
        <View style={styles.fuzzyBadgeOverlay}>
          <Text style={styles.fuzzyBadgeOverlayText}>🎯 {espacio.coincidenciaPorcentaje}% de coincidencia</Text>
        </View>
        <View style={styles.distanciaBadge}>
          <Text style={styles.distanciaBadgeText}>📍 a {espacio.distancia} km</Text>
        </View>
      </View>
      <View style={styles.fuzzyInfo}>
        <Text style={styles.resultSubcat}>{espacio.subcategoria}</Text>
        <Text style={styles.fuzzyNombre} numberOfLines={1}>{espacio.nombre}</Text>
        <Text style={styles.fuzzyDesc} numberOfLines={2}>{espacio.descripcion}</Text>
        <View style={styles.fuzzyFooter}>
          <View style={styles.ratingRow}>
            <StarIcon size={12} color={colors.star} />
            <Text style={styles.ratingText}>{espacio.rating}</Text>
            <Text style={styles.reviewsText}>({espacio.reviews})</Text>
          </View>
          <View style={styles.verDetallesBtn}>
            <Text style={styles.verDetallesText}>Ver Detalles ➔</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
    ...Platform.select({
      ios: { shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginBottom: t.spacing.md,
    paddingTop: t.spacing.sm,
  },
  backButton: {
    padding: t.spacing.xs,
    backgroundColor: t.colors.overlayWhite,
    borderRadius: t.radius.sm,
  },
  headerTitle: {
    color: t.colors.headerText,
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.bold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.overlayWhite,
    borderRadius: t.radius.xl,
    paddingHorizontal: t.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? t.spacing.sm : t.spacing.xs,
    gap: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.overlayWhiteSubtle,
  },
  input: {
    flex: 1,
    fontSize: t.fontSize.base,
    color: t.colors.headerText,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  body: { flex: 1 },
  bodyContent: { padding: t.spacing.lg },

  // Sugerencias
  sectionLabel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: t.spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs,
    marginBottom: t.spacing.xl,
  },
  tag: {
    paddingVertical: 7,
    paddingHorizontal: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  tagText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textSecondary,
  },
  hintCard: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    gap: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
  },
  hintEmoji: { fontSize: 20 },
  hintText: { flex: 1 },
  hintTitle: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  hintDesc: {
    fontSize: t.fontSize.xs - 1,
    color: t.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },

  // Banner "Buscar: X"
  buscarBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: t.colors.primarySoft,
    borderLeftWidth: 4,
    borderLeftColor: t.colors.accent,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  buscarBannerText: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  buscarBannerQuery: {
    color: t.colors.accent,
  },
  buscarBannerArrow: {
    fontSize: t.fontSize.lg,
    color: t.colors.accent,
    fontWeight: t.fontWeight.bold,
  },

  // Resultados exactos
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: t.spacing.md,
  },
  resultsLabel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.medium,
    color: t.colors.textSecondary,
  },
  resultsCount: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textSecondary,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    padding: t.spacing.sm,
    marginBottom: t.spacing.sm,
    gap: t.spacing.sm,
    ...Platform.select({
      ios: { shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  resultImage: { width: 64, height: 64, borderRadius: t.radius.lg },
  resultInfo: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultSubcat: {
    fontSize: t.fontSize.xs - 1,
    fontWeight: t.fontWeight.bold,
    color: t.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: t.fontSize.xs - 1, fontWeight: t.fontWeight.bold, color: t.colors.textPrimary },
  reviewsText: { fontSize: t.fontSize.xs - 1, color: t.colors.textMuted },
  resultNombre: { fontSize: t.fontSize.xs, fontWeight: t.fontWeight.bold, color: t.colors.primaryText, marginTop: 2 },
  resultBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  distanciaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanciaText: { fontSize: t.fontSize.xs - 1, color: t.colors.textSecondary },
  precioText: { fontSize: t.fontSize.xs, fontWeight: t.fontWeight.bold, color: t.colors.textPrimary },
  unidadText: { fontSize: t.fontSize.xs - 1, fontWeight: '400', color: t.colors.textMuted },

  // Estado vacío
  emptyState: {
    alignItems: 'center',
    paddingVertical: t.spacing.xxxl,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.xl,
  },
  emptyTitle: { fontSize: t.fontSize.base, fontWeight: t.fontWeight.bold, color: t.colors.primaryText, marginBottom: t.spacing.xs },
  emptyDesc: { fontSize: t.fontSize.xs, color: t.colors.textSecondary, textAlign: 'center' },

  // Pantalla sugeridos
  sugeridosHeader: {
    backgroundColor: t.colors.primary,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  sugeridosHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  sugeridosTitle: { color: t.colors.headerText, fontSize: t.fontSize.base, fontWeight: t.fontWeight.bold },
  sugeridosSubtitle: { color: t.colors.headerTextMuted, fontSize: t.fontSize.xs - 1, letterSpacing: 0.4, marginTop: 1 },
  fuzzyBadge: {
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.full,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
  },
  fuzzyBadgeText: { color: t.colors.onAccent, fontSize: t.fontSize.xs - 1, fontWeight: t.fontWeight.bold },

  // Tarjeta algoritmo
  algorithmCard: {
    backgroundColor: t.colors.primarySoft,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
  },
  algorithmTitle: { fontSize: t.fontSize.xs, fontWeight: t.fontWeight.bold, color: t.colors.primaryText, marginBottom: 4 },
  algorithmDesc: { fontSize: t.fontSize.xs - 1, color: t.colors.textSecondary, lineHeight: 16 },
  algorithmQuery: { fontWeight: t.fontWeight.semiBold, color: t.colors.primary },

  // Tarjeta fuzzy
  fuzzyCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: t.spacing.md,
    ...Platform.select({
      ios: { shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  fuzzyImageContainer: { height: 128, position: 'relative' },
  fuzzyImage: { width: '100%', height: '100%' },
  fuzzyBadgeOverlay: {
    position: 'absolute',
    top: t.spacing.sm,
    left: t.spacing.sm,
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.full,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
  },
  fuzzyBadgeOverlayText: { color: t.colors.onAccent, fontSize: t.fontSize.xs - 1, fontWeight: t.fontWeight.bold },
  distanciaBadge: {
    position: 'absolute',
    bottom: t.spacing.sm,
    right: t.spacing.sm,
    backgroundColor: t.colors.primaryScrim,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: 3,
  },
  distanciaBadgeText: { color: t.colors.headerText, fontSize: t.fontSize.xs - 2, fontWeight: t.fontWeight.bold },
  fuzzyInfo: { padding: t.spacing.md },
  fuzzyNombre: { fontSize: t.fontSize.sm, fontWeight: t.fontWeight.bold, color: t.colors.primaryText, marginTop: 2, marginBottom: t.spacing.xs },
  fuzzyDesc: { fontSize: t.fontSize.xs - 1, color: t.colors.textSecondary, lineHeight: 16, marginBottom: t.spacing.sm },
  fuzzyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: t.colors.borderSubtle, paddingTop: t.spacing.xs },
  verDetallesBtn: {
    backgroundColor: t.colors.accentSoft,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 6,
  },
  verDetallesText: { fontSize: t.fontSize.xs, fontWeight: t.fontWeight.bold, color: t.colors.primary },
}));
