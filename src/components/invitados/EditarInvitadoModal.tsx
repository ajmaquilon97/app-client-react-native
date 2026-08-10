import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Invitado } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { editarInvitado } from '@/services/invitados.service';
import { makeStyles, useTheme } from '@/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EditarInvitadoModalProps {
  visible: boolean;
  reservaId: number;
  invitado: Invitado | null;
  onClose: () => void;
  onSaved: (invitado: Invitado) => void;
}

export default function EditarInvitadoModal({
  visible,
  reservaId,
  invitado,
  onClose,
  onSaved,
}: EditarInvitadoModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { fetchAuthorized } = useAuth();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && invitado) {
      setNombre(invitado.nombre);
      setCorreo(invitado.correo);
      setError('');
    }
  }, [visible, invitado]);

  const handleGuardar = async () => {
    if (!invitado) return;
    const nombreTrim = nombre.trim();
    const correoTrim = correo.trim();
    if (!nombreTrim) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    if (!EMAIL_REGEX.test(correoTrim)) {
      setError('Ingresa un correo válido.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const actualizado = await fetchAuthorized(accessToken =>
        editarInvitado(reservaId, invitado.id, { nombre: nombreTrim, correo: correoTrim }, accessToken),
      );
      onSaved(actualizado);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo editar el invitado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Corregir invitado</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre del invitado"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={[styles.label, styles.labelSpaced]}>Correo</Text>
          <TextInput
            value={correo}
            onChangeText={setCorreo}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Se enviará una invitación nueva a esta dirección y la anterior dejará de ser válida.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity activeOpacity={0.8} style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleGuardar}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.saveBtnText}>Guardar y reenviar</Text>
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
  label: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelSpaced: {
    marginTop: t.spacing.sm,
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
  warningBanner: {
    backgroundColor: t.colors.background,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  warningText: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
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
  saveBtn: {
    flex: 2,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.textInverse,
  },
}));
