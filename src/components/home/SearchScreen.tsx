import React, { useRef, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { ESPACIOS_DATA } from '@/data/espacios';
import { ArrowLeftIcon, SearchIcon, CloseCircleIcon, StarIcon, LocationIcon } from '@/components/icons';

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

function calcularCoincidenciasFuzzy(query: string): ResultadoBusqueda {
  if (!query.trim()) return { exactas: [], aproximadas: [], esFuzzyMode: false };

  const queryLimpia = query.toLowerCase().trim();
  const tokens = queryLimpia.split(/\s+/).filter(w => w.length > 1);

  const exactas = ESPACIOS_DATA.filter(e => {
    const campo = `${e.nombre} ${e.subcategoria} ${e.ubicacion} ${e.descripcion}`.toLowerCase();
    return campo.includes(queryLimpia);
  });

  const aproximadas: EspacioConCoincidencia[] = ESPACIOS_DATA.map(e => {
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
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [pantallaSugeridos, setPantallaSugeridos] = useState(false);

  const { exactas, aproximadas, esFuzzyMode } = useMemo(
    () => calcularCoincidenciasFuzzy(busqueda),
    [busqueda],
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

      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.backButton}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ArrowLeftIcon size={20} color={Colors.white} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Buscar Espacio</Text>
          </View>

          <View style={styles.inputContainer}>
            <SearchIcon size={18} color={Colors.teal200} />
            <TextInput
              ref={inputRef}
              value={busqueda}
              onChangeText={onChangeText}
              placeholder="Escribe para buscar..."
              placeholderTextColor="rgba(203, 213, 225, 0.8)"
              style={styles.input}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              selectionColor={Colors.accentTeal}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity
                onPress={() => onChangeText('')}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <CloseCircleIcon size={18} color="rgba(203,213,225,0.8)" />
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
                  Buscar: <Text style={styles.buscarBannerQuery}>"{busqueda}"</Text>
                </Text>
                <Text style={styles.buscarBannerArrow}>➔</Text>
              </TouchableOpacity>

              {/* Contador */}
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsLabel}>Resultados para "{busqueda}"</Text>
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

      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.container}>

        {/* Header sugeridos */}
        <View style={[styles.sugeridosHeader, { paddingTop: insets.top }]}>
          <View style={styles.sugeridosHeaderLeft}>
            <TouchableOpacity
              onPress={() => setPantallaSugeridos(false)}
              style={styles.backButton}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ArrowLeftIcon size={20} color={Colors.white} strokeWidth={2.5} />
            </TouchableOpacity>
            <View>
              <Text style={styles.sugeridosTitle}>Lugares Sugeridos</Text>
              <Text style={styles.sugeridosSubtitle}>Búsqueda: "{busqueda}"</Text>
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
              <Text style={styles.algorithmQuery}>"{busqueda}"</Text>, ordenados de mayor a menor relevancia.
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
            <StarIcon size={12} />
            <Text style={styles.ratingText}>{espacio.rating}</Text>
          </View>
        </View>
        <Text style={styles.resultNombre} numberOfLines={1}>{espacio.nombre}</Text>
        <View style={styles.resultBottomRow}>
          <View style={styles.distanciaRow}>
            <LocationIcon size={12} color={Colors.gray400} strokeWidth={1.8} />
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
            <StarIcon size={12} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.sm,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.white,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.lg },

  // Sugerencias
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  tag: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray600,
  },
  hintCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  hintEmoji: { fontSize: 20 },
  hintText: { flex: 1 },
  hintTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  hintDesc: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray500,
    marginTop: 2,
    lineHeight: 16,
  },

  // Banner "Buscar: X"
  buscarBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryDarkLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentTeal,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  buscarBannerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  buscarBannerQuery: {
    color: Colors.accentTeal,
  },
  buscarBannerArrow: {
    fontSize: FontSize.lg,
    color: Colors.accentTeal,
    fontWeight: FontWeight.bold,
  },

  // Resultados exactos
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultsLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.gray500,
  },
  resultsCount: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray500,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  resultImage: { width: 64, height: 64, borderRadius: BorderRadius.lg },
  resultInfo: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultSubcat: {
    fontSize: FontSize.xs - 1,
    fontWeight: FontWeight.bold,
    color: Colors.accentTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: FontSize.xs - 1, fontWeight: FontWeight.bold, color: Colors.gray700 },
  reviewsText: { fontSize: FontSize.xs - 1, color: Colors.gray400 },
  resultNombre: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primaryDark, marginTop: 2 },
  resultBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  distanciaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanciaText: { fontSize: FontSize.xs - 1, color: Colors.gray500 },
  precioText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  unidadText: { fontSize: FontSize.xs - 1, fontWeight: '400', color: Colors.gray400 },

  // Estado vacío
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.primaryDark, marginBottom: Spacing.xs },
  emptyDesc: { fontSize: FontSize.xs, color: Colors.gray500, textAlign: 'center' },

  // Pantalla sugeridos
  sugeridosHeader: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  sugeridosHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sugeridosTitle: { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  sugeridosSubtitle: { color: Colors.teal200, fontSize: FontSize.xs - 1, letterSpacing: 0.4, marginTop: 1 },
  fuzzyBadge: {
    backgroundColor: Colors.accentTeal,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  fuzzyBadgeText: { color: Colors.white, fontSize: FontSize.xs - 1, fontWeight: FontWeight.bold },

  // Tarjeta algoritmo
  algorithmCard: {
    backgroundColor: Colors.primaryDarkLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  algorithmTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primaryDark, marginBottom: 4 },
  algorithmDesc: { fontSize: FontSize.xs - 1, color: Colors.gray500, lineHeight: 16 },
  algorithmQuery: { fontWeight: FontWeight.semiBold, color: Colors.primaryDark },

  // Tarjeta fuzzy
  fuzzyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  fuzzyImageContainer: { height: 128, position: 'relative' },
  fuzzyImage: { width: '100%', height: '100%' },
  fuzzyBadgeOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accentTeal,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  fuzzyBadgeOverlayText: { color: Colors.white, fontSize: FontSize.xs - 1, fontWeight: FontWeight.bold },
  distanciaBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.primaryDarkMedium,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
  },
  distanciaBadgeText: { color: Colors.white, fontSize: FontSize.xs - 2, fontWeight: FontWeight.bold },
  fuzzyInfo: { padding: Spacing.md },
  fuzzyNombre: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primaryDark, marginTop: 2, marginBottom: Spacing.xs },
  fuzzyDesc: { fontSize: FontSize.xs - 1, color: Colors.gray500, lineHeight: 16, marginBottom: Spacing.sm },
  fuzzyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: Spacing.xs },
  verDetallesBtn: {
    backgroundColor: Colors.tealLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  verDetallesText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primaryDark },
});
