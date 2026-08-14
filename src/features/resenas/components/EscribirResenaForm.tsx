import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { makeStyles, useTheme } from '@/shared/theme';
import StarRatingInput from '@/shared/ui/StarRatingInput';

import { useCrearResena } from '../hooks/useResenaMutations';
import { ResenaApiError } from '../errors';

const TITULO_MAX = 200;
const DESCRIPCION_MAX = 1000;

interface EscribirResenaFormProps {
  espacioId: number;
  reservaId: number;
}

export default function EscribirResenaForm({ espacioId, reservaId }: EscribirResenaFormProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [calificacion, setCalificacion] = useState(0);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');

  const crear = useCrearResena(espacioId);

  const handleEnviar = () => {
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
    crear.mutate(
      { reservaId, titulo: tituloTrim, descripcion: descripcionTrim, calificacion },
      {
        onSuccess: () => {
          setCalificacion(0);
          setTitulo('');
          setDescripcion('');
        },
        onError: err => {
          // Un 409 es "esta reserva ya tiene reseña": no es un fallo de campo,
          // así que se avisa aparte del error inline de validación.
          if (err instanceof ResenaApiError && err.status === 409) {
            Alert.alert('No se pudo publicar', err.message, [{ text: 'Entendido' }]);
          } else if (err instanceof ResenaApiError && err.fieldErrors) {
            setError(Object.values(err.fieldErrors).flat().join(' '));
          } else {
            Alert.alert(
              'No se pudo publicar tu reseña',
              err instanceof Error ? err.message : 'Intenta de nuevo.',
              [{ text: 'Entendido' }],
            );
          }
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cuéntanos cómo te fue</Text>

      <StarRatingInput value={calificacion} onChange={setCalificacion} />

      <TextInput
        value={titulo}
        onChangeText={v => setTitulo(v.slice(0, TITULO_MAX))}
        placeholder="Título de tu reseña"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.counter}>
        {titulo.length}/{TITULO_MAX}
      </Text>

      <TextInput
        value={descripcion}
        onChangeText={v => setDescripcion(v.slice(0, DESCRIPCION_MAX))}
        placeholder="Cuéntanos los detalles de tu experiencia"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        style={[styles.input, styles.textarea]}
      />
      <Text style={styles.counter}>
        {descripcion.length}/{DESCRIPCION_MAX}
      </Text>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleEnviar}
        disabled={crear.isPending}
        style={[styles.submitBtn, crear.isPending && styles.submitBtnDisabled]}>
        {crear.isPending ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.submitBtnText}>Publicar reseña</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Estilos alineados con EditarResenaModal (mismo formulario, mismos campos).
const useStyles = makeStyles(t => ({
  container: {
    gap: t.spacing.xs,
  },
  title: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    marginBottom: t.spacing.xxs,
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
  counter: {
    fontSize: t.fontSize.xxs,
    color: t.colors.textMuted,
    textAlign: 'right',
  },
  errorText: {
    fontSize: t.fontSize.xs,
    color: t.colors.error,
    fontWeight: t.fontWeight.medium,
  },
  submitBtn: {
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginTop: t.spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.onPrimary,
  },
}));
