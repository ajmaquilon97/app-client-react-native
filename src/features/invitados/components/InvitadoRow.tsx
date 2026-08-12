import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

import { makeStyles, useTheme } from '@/shared/theme';

import EditarInvitadoModal from './EditarInvitadoModal';
import { InvitadoApiError } from '../errors';
import { useReenviarInvitado } from '../hooks/useInvitadoMutations';
import { Invitado } from '../types';

const DEFAULT_COOLDOWN_SECONDS = 300;

interface InvitadoRowProps {
  reservaId: number;
  invitado: Invitado;
}

export default function InvitadoRow({ reservaId, invitado }: InvitadoRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [showEditar, setShowEditar] = useState(false);

  // El efecto solo suscribe el reloj; el `setState` va dentro del callback del
  // intervalo, no en el cuerpo del efecto. Los segundos restantes se derivan del
  // render en vez de guardarse en su propio estado.
  useEffect(() => {
    if (!cooldownUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setAhora(now);
      if (now >= cooldownUntil) setCooldownUntil(null);
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const ingresado = invitado.estado === 'Ingresado';
  const segundosRestantes = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - ahora) / 1000))
    : 0;
  const enCooldown = segundosRestantes > 0;

  const reenviar = useReenviarInvitado(reservaId);
  const reenviando = reenviar.isPending;

  const handleReenviar = () => {
    reenviar.mutate(invitado.id, {
      onSuccess: () =>
        Alert.alert('Reenviada', 'Se reenvió la credencial al correo del invitado.', [
          { text: 'Entendido' },
        ]),
      onError: err => {
        if (err instanceof InvitadoApiError && err.status === 400) {
          setLimiteAlcanzado(true);
          Alert.alert(
            'Límite alcanzado',
            'Ya reenviaste esta invitación 3 veces. Contacta al anfitrión si tu invitado sigue sin recibirla.',
            [{ text: 'Entendido' }],
          );
        } else if (err instanceof InvitadoApiError && err.status === 429) {
          const desde = Date.now();
          setAhora(desde);
          setCooldownUntil(desde + (err.retryAfterSeconds ?? DEFAULT_COOLDOWN_SECONDS) * 1000);
          Alert.alert('Espera unos minutos', 'Espera unos minutos antes de volver a enviar.', [
            { text: 'Entendido' },
          ]);
        } else {
          Alert.alert('No se pudo reenviar', err.message || 'Intenta de nuevo.', [
            { text: 'Entendido' },
          ]);
        }
      },
    });
  };

  // Editar regenera credenciales y resetea el contador de reenvíos en backend:
  // el cooldown y el tope local tienen que irse con él.
  const handleSaved = () => {
    setLimiteAlcanzado(false);
    setCooldownUntil(null);
  };

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>
          {invitado.nombre || 'Sin nombre'}
        </Text>
        <Text style={styles.correo} numberOfLines={1}>
          {invitado.correo || 'Sin correo'}
        </Text>
      </View>

      <View style={[styles.chip, ingresado ? styles.chipIngresado : styles.chipEnviado]}>
        <Text style={[styles.chipText, ingresado ? styles.chipTextIngresado : styles.chipTextEnviado]}>
          {ingresado ? '✓ Ingresó' : 'Enviado'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={reenviando || limiteAlcanzado || enCooldown}
          onPress={handleReenviar}
          style={styles.actionBtn}>
          {reenviando ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Text style={[styles.actionText, (limiteAlcanzado || enCooldown) && styles.actionTextDisabled]}>
              {enCooldown ? `Reenviar (${segundosRestantes}s)` : 'Reenviar'}
            </Text>
          )}
        </TouchableOpacity>

        {!ingresado && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => setShowEditar(true)} style={styles.actionBtn}>
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <EditarInvitadoModal
        visible={showEditar}
        reservaId={reservaId}
        invitado={invitado}
        onClose={() => setShowEditar(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    padding: t.spacing.sm,
    gap: t.spacing.xs,
  },
  info: {
    gap: 1,
  },
  nombre: {
    fontSize: t.fontSize.sm,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  correo: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 3,
    borderRadius: t.radius.full,
  },
  chipEnviado: {
    backgroundColor: t.colors.surfaceMuted,
  },
  chipIngresado: {
    backgroundColor: t.colors.successSoft,
  },
  chipText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
  },
  chipTextEnviado: {
    color: t.colors.textSecondary,
  },
  chipTextIngresado: {
    color: t.colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: t.spacing.md,
    marginTop: 2,
  },
  actionBtn: {
    minHeight: 24,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: t.fontSize.xs,
    fontWeight: t.fontWeight.bold,
    color: t.colors.accent,
  },
  actionTextDisabled: {
    color: t.colors.borderStrong,
  },
}));
