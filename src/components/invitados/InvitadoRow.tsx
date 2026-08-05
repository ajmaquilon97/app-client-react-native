import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Invitado } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { reenviarInvitado, InvitadoApiError } from '@/services/invitados.service';
import EditarInvitadoModal from '@/components/invitados/EditarInvitadoModal';

const DEFAULT_COOLDOWN_SECONDS = 300;

interface InvitadoRowProps {
  reservaId: number;
  invitado: Invitado;
  onUpdated: (invitado: Invitado) => void;
}

export default function InvitadoRow({ reservaId, invitado, onUpdated }: InvitadoRowProps) {
  const { fetchAuthorized } = useAuth();
  const [reenviando, setReenviando] = useState(false);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [showEditar, setShowEditar] = useState(false);

  useEffect(() => {
    if (!cooldownUntil) {
      setSegundosRestantes(0);
      return;
    }
    const tick = () => {
      const restante = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setSegundosRestantes(restante);
      if (restante <= 0) setCooldownUntil(null);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const ingresado = invitado.estado === 'Ingresado';
  const enCooldown = segundosRestantes > 0;

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      await fetchAuthorized(accessToken => reenviarInvitado(reservaId, invitado.id, accessToken));
      Alert.alert('Reenviada', 'Se reenvió la credencial al correo del invitado.', [{ text: 'Entendido' }]);
    } catch (err) {
      if (err instanceof InvitadoApiError && err.status === 400) {
        setLimiteAlcanzado(true);
        Alert.alert(
          'Límite alcanzado',
          'Ya reenviaste esta invitación 3 veces. Contacta al anfitrión si tu invitado sigue sin recibirla.',
          [{ text: 'Entendido' }],
        );
      } else if (err instanceof InvitadoApiError && err.status === 429) {
        setCooldownUntil(Date.now() + (err.retryAfterSeconds ?? DEFAULT_COOLDOWN_SECONDS) * 1000);
        Alert.alert('Espera unos minutos', 'Espera unos minutos antes de volver a enviar.', [
          { text: 'Entendido' },
        ]);
      } else {
        Alert.alert(
          'No se pudo reenviar',
          err instanceof Error ? err.message : 'Intenta de nuevo.',
          [{ text: 'Entendido' }],
        );
      }
    } finally {
      setReenviando(false);
    }
  };

  const handleSaved = (actualizado: Invitado) => {
    onUpdated(actualizado);
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
            <ActivityIndicator size="small" color={Colors.gray500} />
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

const styles = StyleSheet.create({
  row: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  info: {
    gap: 1,
  },
  nombre: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  correo: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  chipEnviado: {
    backgroundColor: Colors.gray100,
  },
  chipIngresado: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  chipTextEnviado: {
    color: Colors.gray600,
  },
  chipTextIngresado: {
    color: Colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 2,
  },
  actionBtn: {
    minHeight: 24,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.accentTeal,
  },
  actionTextDisabled: {
    color: Colors.gray300,
  },
});
