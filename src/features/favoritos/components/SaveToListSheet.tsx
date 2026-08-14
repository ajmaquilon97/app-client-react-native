import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';

import { PlusIcon, CheckIcon } from '@/shared/ui/icons';
import { makeStyles, useTheme } from '@/shared/theme';

import CrearListaModal from './CrearListaModal';
import { useGuardarEnLista } from '../hooks/useFavoritoMutations';
import { useListasFavoritos } from '../hooks/useListasFavoritos';
import { ListaFavoritos } from '../types';

interface SaveToListSheetProps {
  visible: boolean;
  espacioId: number | null;
  onClose: () => void;
}

export default function SaveToListSheet({ visible, espacioId, onClose }: SaveToListSheetProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { data: listas = [], isLoading } = useListasFavoritos();
  const [guardadaListaId, setGuardadaListaId] = useState<number | null>(null);
  const [crearListaVisible, setCrearListaVisible] = useState(false);

  const guardar = useGuardarEnLista();
  // `variables` conserva la lista en vuelo mientras la mutación está pendiente.
  const guardandoListaId = guardar.isPending ? guardar.variables.listaId : null;

  const handleGuardarEn = (lista: ListaFavoritos) => {
    if (espacioId == null || guardar.isPending) return;
    guardar.mutate(
      { espacioId, listaId: lista.id },
      // Best effort: si falla, el usuario puede reintentar tocando la lista.
      { onSuccess: () => setGuardadaListaId(lista.id) },
    );
  };

  const handleListaCreada = (lista: ListaFavoritos) => {
    setCrearListaVisible(false);
    handleGuardarEn(lista);
  };

  const handleClose = () => {
    setGuardadaListaId(null);
    onClose();
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Guardar en…</Text>

            {isLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.loading} />
            ) : (
              <FlatList
                data={listas}
                keyExtractor={item => String(item.id)}
                style={styles.list}
                renderItem={({ item }) => {
                  const guardando = guardandoListaId === item.id;
                  const guardada = guardadaListaId === item.id;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.row}
                      onPress={() => handleGuardarEn(item)}
                      disabled={guardando}>
                      <View style={styles.rowInfo}>
                        <Text style={styles.rowNombre}>{item.nombre}</Text>
                        <Text style={styles.rowCount}>
                          {item.cantidadEspacios} espacio{item.cantidadEspacios !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      {guardando ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : guardada ? (
                        <CheckIcon size={18} color={colors.accent} strokeWidth={3} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Aún no tienes listas de favoritos.</Text>
                }
              />
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.nuevaListaBtn}
              onPress={() => setCrearListaVisible(true)}>
              <PlusIcon size={16} color={colors.accent} strokeWidth={2.5} />
              <Text style={styles.nuevaListaText}>Crear nueva lista</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <CrearListaModal
        visible={crearListaVisible}
        onClose={() => setCrearListaVisible(false)}
        onCreated={handleListaCreada}
      />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    padding: t.spacing.lg,
    maxHeight: '70%',
  },
  title: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.sm,
  },
  loading: {
    paddingVertical: t.spacing.lg,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: t.spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderSubtle,
  },
  rowInfo: {
    flex: 1,
  },
  rowNombre: {
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textPrimary,
  },
  rowCount: {
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
    marginTop: 1,
  },
  emptyText: {
    fontSize: t.fontSize.sm,
    color: t.colors.textMuted,
    paddingVertical: t.spacing.md,
  },
  nuevaListaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    paddingVertical: t.spacing.sm + 2,
    marginTop: t.spacing.xs,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.accent,
  },
  nuevaListaText: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
    color: t.colors.accent,
  },
}));
