import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import StarRatingInput from '@/shared/ui/StarRatingInput';
import { makeStyles, useTheme } from '@/shared/theme';

import { useActualizarResena } from '../hooks/useResenaMutations';
import { ResenaApiError } from '../errors';
import { Resena } from '../types';

const TITULO_MAX = 200;
const DESCRIPCION_MAX = 1000;

interface EditarResenaModalProps {
  visible: boolean;
  espacioId: number;
  resena: Resena | null;
  onClose: () => void;
}

export default function EditarResenaModal({
  visible,
  espacioId,
  resena,
  onClose,
}: EditarResenaModalProps) {
  const styles = useStyles();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* El `key` remonta el formulario cada vez que se abre o cambia la
            reseña, así los campos arrancan con sus valores sin necesidad de un
            efecto que sincronice estado (Rules of React: set-state-in-effect). */}
        {visible && resena && (
          <Formulario
            key={`${resena.id}-${resena.fechaCreacion}`}
            espacioId={espacioId}
            resena={resena}
            onClose={onClose}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface FormularioProps {
  espacioId: number;
  resena: Resena;
  onClose: () => void;
}

function Formulario({ espacioId, resena, onClose }: FormularioProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [calificacion, setCalificacion] = useState(resena.calificacion);
  const [titulo, setTitulo] = useState(resena.titulo);
  const [descripcion, setDescripcion] = useState(resena.descripcion);
  const [error, setError] = useState('');

  const actualizar = useActualizarResena(espacioId);
  const saving = actualizar.isPending;

  const handleGuardar = () => {
    const tituloTrim = titulo.trim();
    const descripcionTrim = descripcion.trim();

    if (calificacion < 1) {
      setError('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }
    if (!tituloTrim) {
      setError('El título es obligatorio.');
      return;
    }
    if (!descripcionTrim) {
      setError('La descripción es obligatoria.');
      return;
    }

    setError('');
    actualizar.mutate(
      {
        resenaId: resena.id,
        input: { titulo: tituloTrim, descripcion: descripcionTrim, calificacion },
      },
      {
        onSuccess: onClose,
        onError: err => {
          if (err instanceof ResenaApiError && err.fieldErrors) {
            setError(Object.values(err.fieldErrors).flat().join(' '));
          } else {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar la reseña.');
          }
        },
      },
    );
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Editar reseña</Text>

      <StarRatingInput value={calificacion} onChange={setCalificacion} />

      <Text style={[styles.label, styles.labelSpaced]}>Título</Text>
      <TextInput
        value={titulo}
        onChangeText={v => setTitulo(v.slice(0, TITULO_MAX))}
        placeholder="Título de tu reseña"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />

      <Text style={[styles.label, styles.labelSpaced]}>Descripción</Text>
      <TextInput
        value={descripcion}
        onChangeText={v => setDescripcion(v.slice(0, DESCRIPCION_MAX))}
        placeholder="Cuéntanos los detalles de tu experiencia"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.textarea]}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.cancelBtn}
          onPress={onClose}
          disabled={saving}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleGuardar}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    fontSize: t.fontSize.base,
    color: t.colors.textPrimary,
    backgroundColor: t.colors.surface,
  },
  textarea: {
    minHeight: 90,
    paddingTop: t.spacing.sm,
    textAlignVertical: 'top',
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
    color: t.colors.onPrimary,
  },
}));
