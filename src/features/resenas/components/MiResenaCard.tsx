import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import StarRating from '@/shared/ui/StarRating';
import { makeStyles } from '@/shared/theme';

import EditarResenaModal from './EditarResenaModal';
import { useEliminarResena } from '../hooks/useResenaMutations';
import { Resena } from '../types';

interface MiResenaCardProps {
  espacioId: number;
  resena: Resena;
}

// fechaCreacion puede llegar sin sufijo "Z" (§2.3 del spec) — forzamos UTC al parsear.
function formatFecha(iso: string): string {
  const conZona = iso.endsWith('Z') ? iso : `${iso}Z`;
  return new Date(conZona).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MiResenaCard({ espacioId, resena }: MiResenaCardProps) {
  const styles = useStyles();
  const [showEditar, setShowEditar] = useState(false);

  const eliminar = useEliminarResena(espacioId);

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar reseña',
      '¿Seguro que quieres eliminar tu reseña? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            eliminar.mutate(resena.id, {
              onError: err =>
                Alert.alert(
                  'No se pudo eliminar',
                  err instanceof Error ? err.message : 'Intenta de nuevo.',
                  [{ text: 'Entendido' }],
                ),
            }),
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <StarRating rating={resena.calificacion} size="md" />
        <Text style={styles.fecha}>{formatFecha(resena.fechaCreacion)}</Text>
      </View>
      <Text style={styles.titulo}>{resena.titulo}</Text>
      <Text style={styles.descripcion}>{resena.descripcion}</Text>

      <View style={styles.actions}>
        {eliminar.isPending ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setShowEditar(true)}>
              <Text style={styles.actionText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={handleEliminar}>
              <Text style={[styles.actionText, styles.actionTextDestructive]}>Eliminar</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <EditarResenaModal
        visible={showEditar}
        espacioId={espacioId}
        resena={resena}
        onClose={() => setShowEditar(false)}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    gap: t.spacing.xxs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fecha: {
    fontSize: t.fontSize.xs,
    color: t.colors.textMuted,
  },
  titulo: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.extraBold,
    color: t.colors.primaryText,
    marginTop: t.spacing.xxs,
  },
  descripcion: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: t.spacing.md,
    marginTop: t.spacing.xs,
  },
  actionText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.accent,
  },
  actionTextDestructive: {
    color: t.colors.error,
  },
}));
