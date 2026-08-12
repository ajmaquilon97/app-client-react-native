import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

import { makeStyles, useTheme } from '@/shared/theme';

import { InvitadoApiError } from '../errors';
import { useAsignarInvitados } from '../hooks/useInvitadoMutations';
import { InvitadoInput } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FilaInvitado extends InvitadoInput {
  key: string;
}

let nextKey = 0;
function filaVacia(): FilaInvitado {
  nextKey += 1;
  return { key: `f${nextKey}`, nombre: '', correo: '' };
}

interface AsignarInvitadosFormProps {
  reservaId: number;
  disponibleEstimado: number | null;
}

export default function AsignarInvitadosForm({
  reservaId,
  disponibleEstimado,
}: AsignarInvitadosFormProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [filas, setFilas] = useState<FilaInvitado[]>([filaVacia()]);
  const [error, setError] = useState('');

  const asignar = useAsignarInvitados(reservaId);
  const enviando = asignar.isPending;

  const alTope = disponibleEstimado != null && filas.length >= Math.max(disponibleEstimado, 1);

  const actualizarFila = (key: string, campo: 'nombre' | 'correo', valor: string) => {
    setFilas(prev => prev.map(f => (f.key === key ? { ...f, [campo]: valor } : f)));
  };

  const agregarFila = () => {
    if (alTope) return;
    setFilas(prev => [...prev, filaVacia()]);
  };

  const quitarFila = (key: string) => {
    setFilas(prev => (prev.length > 1 ? prev.filter(f => f.key !== key) : prev));
  };

  const handleAsignar = () => {
    const invitados: InvitadoInput[] = filas.map(f => ({ nombre: f.nombre.trim(), correo: f.correo.trim() }));

    for (const inv of invitados) {
      if (!inv.nombre) {
        setError('Completa el nombre de cada invitado.');
        return;
      }
      if (!EMAIL_REGEX.test(inv.correo)) {
        setError('Revisa que todos los correos tengan un formato válido.');
        return;
      }
    }

    setError('');
    asignar.mutate(invitados, {
      onSuccess: () => setFilas([filaVacia()]),
      onError: err => {
        if (err instanceof InvitadoApiError && err.status === 409) {
          Alert.alert('No hay suficiente cupo', err.message, [{ text: 'Entendido' }]);
        } else if (err instanceof InvitadoApiError && err.hasFieldErrors) {
          setError(
            'Revisa los datos ingresados: el nombre es obligatorio y el correo debe tener un formato válido.',
          );
        } else {
          Alert.alert('No se pudieron asignar los invitados', err.message || 'Intenta de nuevo.', [
            { text: 'Entendido' },
          ]);
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agregar invitados</Text>
      {disponibleEstimado != null && (
        <Text style={styles.helper}>Puedes agregar hasta {disponibleEstimado} invitado(s) más.</Text>
      )}

      {filas.map((fila, index) => (
        <View key={fila.key} style={styles.filaCard}>
          <View style={styles.filaHeader}>
            <Text style={styles.filaLabel}>Invitado {index + 1}</Text>
            {filas.length > 1 && (
              <TouchableOpacity onPress={() => quitarFila(fila.key)}>
                <Text style={styles.quitarText}>Quitar</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            value={fila.nombre}
            onChangeText={v => actualizarFila(fila.key, 'nombre', v)}
            placeholder="Nombre"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            value={fila.correo}
            onChangeText={v => actualizarFila(fila.key, 'correo', v)}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>
      ))}

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.formActions}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={agregarFila}
          disabled={alTope}
          style={[styles.addBtn, alTope && styles.addBtnDisabled]}>
          <Text style={[styles.addBtnText, alTope && styles.addBtnTextDisabled]}>+ Agregar otro invitado</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAsignar}
          disabled={enviando}
          style={[styles.submitBtn, enviando && styles.submitBtnDisabled]}>
          {enviando ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitBtnText}>Asignar invitados</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.spacing.sm,
  },
  title: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helper: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    marginTop: -t.spacing.xs,
  },
  filaCard: {
    backgroundColor: t.colors.background,
    borderRadius: t.radius.md,
    padding: t.spacing.sm,
    gap: t.spacing.xs,
  },
  filaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filaLabel: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.textSecondary,
  },
  quitarText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.semiBold,
    color: t.colors.error,
  },
  input: {
    height: 40,
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
  formActions: {
    gap: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  addBtn: {
    alignItems: 'center',
    paddingVertical: t.spacing.xs,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.accent,
  },
  addBtnTextDisabled: {
    color: t.colors.textMuted,
  },
  submitBtn: {
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.md,
    paddingVertical: t.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
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
