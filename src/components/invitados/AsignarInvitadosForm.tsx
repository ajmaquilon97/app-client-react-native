import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { InvitacionAsignada, InvitadoInput } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { asignarInvitados, InvitadoApiError } from '@/services/invitados.service';

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
  onAsignados: (invitaciones: InvitacionAsignada[]) => void;
}

export default function AsignarInvitadosForm({
  reservaId,
  disponibleEstimado,
  onAsignados,
}: AsignarInvitadosFormProps) {
  const { fetchAuthorized } = useAuth();
  const [filas, setFilas] = useState<FilaInvitado[]>([filaVacia()]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

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

  const handleAsignar = async () => {
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
    setEnviando(true);
    try {
      const nuevos = await fetchAuthorized(accessToken => asignarInvitados(reservaId, invitados, accessToken));
      onAsignados(nuevos);
      setFilas([filaVacia()]);
    } catch (err) {
      if (err instanceof InvitadoApiError && err.status === 409) {
        Alert.alert('No hay suficiente cupo', err.message, [{ text: 'Entendido' }]);
      } else if (err instanceof InvitadoApiError && err.hasFieldErrors) {
        setError('Revisa los datos ingresados: el nombre es obligatorio y el correo debe tener un formato válido.');
      } else {
        Alert.alert(
          'No se pudieron asignar los invitados',
          err instanceof Error ? err.message : 'Intenta de nuevo.',
          [{ text: 'Entendido' }],
        );
      }
    } finally {
      setEnviando(false);
    }
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
            placeholderTextColor={Colors.gray400}
            style={styles.input}
          />
          <TextInput
            value={fila.correo}
            onChangeText={v => actualizarFila(fila.key, 'correo', v)}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={Colors.gray400}
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
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.submitBtnText}>Asignar invitados</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helper: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginTop: -Spacing.xs,
  },
  filaCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  filaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filaLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray500,
  },
  quitarText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.error,
  },
  input: {
    height: 40,
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
  formActions: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.accentTeal,
  },
  addBtnTextDisabled: {
    color: Colors.gray400,
  },
  submitBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    color: Colors.white,
  },
});
