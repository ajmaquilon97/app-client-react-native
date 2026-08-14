import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';

import { makeStyles, useTheme } from '@/shared/theme';

import { useCrearLista } from '../hooks/useFavoritoMutations';
import { ListaFavoritos } from '../types';

// Backend: 400 si el nombre viene vacío, en blanco o supera 100 caracteres
// (docs/backend_response/favoritos-listas-response.md §3) — se limita acá para
// no depender del error.
const NOMBRE_MAX_LENGTH = 100;

interface CrearListaModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (lista: ListaFavoritos) => void;
}

export default function CrearListaModal({ visible, onClose, onCreated }: CrearListaModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  const crear = useCrearLista();
  const creando = crear.isPending;

  const handleClose = () => {
    setNombre('');
    setError('');
    onClose();
  };

  const handleCrear = () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      setError('Ponle un nombre a la lista.');
      return;
    }

    setError('');
    crear.mutate(nombreTrim, {
      onSuccess: lista => {
        setNombre('');
        onCreated(lista);
      },
      onError: err => setError(err.message || 'No se pudo crear la lista.'),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Nueva lista</Text>

          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej. Cumpleaños, Mis Canchas…"
            placeholderTextColor={colors.textMuted}
            maxLength={NOMBRE_MAX_LENGTH}
            autoFocus
            style={styles.input}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={handleClose} disabled={creando}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.createBtn, creando && styles.createBtnDisabled]}
              onPress={handleCrear}
              disabled={creando}>
              {creando ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.createBtnText}>Crear lista</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    gap: t.spacing.xs,
  },
  title: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xs,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.sm,
    fontSize: t.fontSize.base,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
  },
  errorText: {
    fontSize: t.fontSize.xs,
    color: t.colors.error,
    fontWeight: t.fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    marginTop: t.spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.textSecondary,
  },
  createBtn: {
    flex: 2,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  createBtnDisabled: {
    opacity: 0.7,
  },
  createBtnText: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.onPrimary,
  },
}));
