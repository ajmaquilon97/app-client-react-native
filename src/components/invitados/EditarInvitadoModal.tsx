import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Invitado } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { editarInvitado } from '@/services/invitados.service';

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
            placeholderTextColor={Colors.gray400}
            style={styles.input}
          />

          <Text style={[styles.label, styles.labelSpaced]}>Correo</Text>
          <TextInput
            value={correo}
            onChangeText={setCorreo}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={Colors.gray400}
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
                <ActivityIndicator size="small" color={Colors.white} />
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelSpaced: {
    marginTop: Spacing.sm,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  warningBanner: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  warningText: {
    fontSize: FontSize.xs,
    color: Colors.gray600,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray600,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.white,
  },
});
