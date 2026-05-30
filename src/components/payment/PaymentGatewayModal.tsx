import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  ScrollView,
  Animated,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { Espacio } from '@/types';
import { ArrowLeftIcon, CheckIcon, PlusIcon } from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedCard {
  id: number;
  numero: string;
  nombre: string;
  fecha: string;
  tipo: 'visa' | 'mastercard';
  cardBgColor: string;
}

const INITIAL_CARDS: SavedCard[] = [
  {
    id: 1,
    numero: '4556 7812 3490 5214',
    nombre: 'MARIANA DE LOS ANGELES',
    fecha: '12/29',
    tipo: 'visa',
    cardBgColor: '#1E293B',
  },
  {
    id: 2,
    numero: '5412 7590 1283 4967',
    nombre: 'MARIANA D. ANGELES',
    fecha: '08/28',
    tipo: 'mastercard',
    cardBgColor: '#0F3460',
  },
];

// ─── Add Card Modal ────────────────────────────────────────────────────────────

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (card: SavedCard) => void;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ visible, onClose, onSave }) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState('');
  const [cvv, setCvv] = useState('');
  const [nombre, setNombre] = useState('');
  const flipAnim = useRef(new Animated.Value(1)).current;
  const [showFront, setShowFront] = useState(true);

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setNumero('');
      setFecha('');
      setCvv('');
      setNombre('');
      setShowFront(true);
      flipAnim.setValue(1);
    }
  }, [visible, flipAnim]);

  const doFlip = useCallback(
    (toFront: boolean) => {
      Animated.timing(flipAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setShowFront(toFront);
        Animated.timing(flipAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    },
    [flipAnim]
  );

  const goToStep = useCallback(
    (s: number) => {
      const wantFront = s !== 3;
      if (wantFront !== showFront) doFlip(wantFront);
      setStep(s);
    },
    [doFlip, showFront]
  );

  const formatNum = (v: string) => {
    const raw = v.replace(/\D/g, '');
    const parts = raw.match(/.{1,4}/g);
    return parts ? parts.slice(0, 4).join(' ') : raw;
  };

  const formatFecha = (v: string) => {
    const raw = v.replace(/\D/g, '');
    return raw.length >= 3 ? `${raw.slice(0, 2)}/${raw.slice(2, 4)}` : raw;
  };

  const nextDisabled =
    (step === 1 && numero.replace(/\s/g, '').length < 15) ||
    (step === 2 && fecha.length < 5) ||
    (step === 3 && cvv.length < 3);

  const cardBg = numero.startsWith('5') ? '#0F3460' : '#1E293B';
  const cardType: 'visa' | 'mastercard' = numero.startsWith('5') ? 'mastercard' : 'visa';

  const handleSave = () => {
    onSave({
      id: Date.now(),
      numero: numero || '4000 1234 5678 9010',
      nombre: (nombre || 'TITULAR TARJETA').toUpperCase(),
      fecha: fecha || '12/30',
      tipo: cardType,
      cardBgColor: cardBg,
    });
  };

  const progressWidth = `${step * 25}%`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={[addSt.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={addSt.header}>
          <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={addSt.headerBtn}>
            <ArrowLeftIcon size={20} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={addSt.headerTitle}>Agregar Tarjeta</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[addSt.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Progress bar */}
          <View style={addSt.progressBox}>
            <View style={addSt.progressLabelRow}>
              <Text style={addSt.progressLabel}>Paso {step} de 4</Text>
              <Text style={addSt.progressLabel}>{step * 25}% completado</Text>
            </View>
            <View style={addSt.progressTrack}>
              <View style={[addSt.progressFill, { width: progressWidth }]} />
            </View>
          </View>

          {/* Card visualizer with flip animation */}
          <View style={addSt.cardWrapper}>
            <Animated.View
              style={[addSt.card, { backgroundColor: cardBg, transform: [{ scaleX: flipAnim }] }]}>
              {showFront ? (
                <>
                  <View style={addSt.cardTopRow}>
                    <View style={addSt.chip}>
                      <View style={addSt.chipGrid}>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <View key={i} style={addSt.chipCell} />
                        ))}
                      </View>
                    </View>
                    <Text style={addSt.cardTypeTxt}>
                      {cardType === 'visa' ? 'VISA' : 'Mastercard'}
                    </Text>
                  </View>
                  <Text style={addSt.cardNumber} numberOfLines={1}>
                    {numero || '•••• •••• •••• ••••'}
                  </Text>
                  <View style={addSt.cardFooterRow}>
                    <View style={addSt.cardFooterLeft}>
                      <Text style={addSt.cardFieldLabel}>Titular de Tarjeta</Text>
                      <Text style={addSt.cardFieldValue} numberOfLines={1}>
                        {nombre || 'TITULAR REQUERIDO'}
                      </Text>
                    </View>
                    <View style={addSt.cardFooterRight}>
                      <Text style={addSt.cardFieldLabel}>Vence</Text>
                      <Text style={addSt.cardFieldValue}>{fecha || 'MM/AA'}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={addSt.magStrip} />
                  <View style={addSt.cvvRow}>
                    <View style={addSt.signaturePanel}>
                      <View style={addSt.sigLines}>
                        <View style={addSt.sigLine} />
                        <View style={addSt.sigLine} />
                        <View style={addSt.sigLine} />
                      </View>
                      <View style={addSt.cvvBox}>
                        <Text style={addSt.cvvText}>{cvv || 'CVV'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={addSt.cardBackFooter}>
                    <Text style={addSt.cardBackNote}>No compartir esta información</Text>
                    <Text style={addSt.cardTypeTxt}>
                      {cardType === 'visa' ? 'VISA' : 'MC'}
                    </Text>
                  </View>
                </>
              )}
            </Animated.View>
          </View>

          {/* Step form */}
          <View style={addSt.formCard}>
            {step === 1 && (
              <>
                <Text style={addSt.formLabel}>Número de la tarjeta</Text>
                <Text style={addSt.formHint}>Registra los 16 dígitos de la parte frontal.</Text>
                <TextInput
                  value={numero}
                  onChangeText={(v) => setNumero(formatNum(v))}
                  placeholder="4000 1234 5678 9010"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="number-pad"
                  maxLength={19}
                  autoFocus
                  style={addSt.input}
                  selectionColor={Colors.accentTeal}
                />
              </>
            )}
            {step === 2 && (
              <>
                <Text style={addSt.formLabel}>Fecha de vencimiento</Text>
                <Text style={addSt.formHint}>Introduce el mes y año (MM/AA).</Text>
                <TextInput
                  value={fecha}
                  onChangeText={(v) => setFecha(formatFecha(v))}
                  placeholder="12/29"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="number-pad"
                  maxLength={5}
                  autoFocus
                  style={[addSt.input, addSt.inputCenter]}
                  selectionColor={Colors.accentTeal}
                />
              </>
            )}
            {step === 3 && (
              <>
                <Text style={addSt.formLabel}>Código de seguridad (CVV)</Text>
                <Text style={addSt.formHint}>Los 3 dígitos de la banda trasera.</Text>
                <TextInput
                  value={cvv}
                  onChangeText={(v) => setCvv(v.replace(/\D/g, ''))}
                  placeholder="•••"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={3}
                  autoFocus
                  style={[addSt.input, addSt.inputCenter]}
                  selectionColor={Colors.accentTeal}
                />
              </>
            )}
            {step === 4 && (
              <>
                <Text style={addSt.formLabel}>Nombre del titular</Text>
                <Text style={addSt.formHint}>Como aparece impreso en la tarjeta.</Text>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="MARIANA DE LOS ANGELES"
                  placeholderTextColor={Colors.gray400}
                  autoCapitalize="characters"
                  autoFocus
                  style={addSt.input}
                  selectionColor={Colors.accentTeal}
                />
              </>
            )}
          </View>

          {/* Navigation buttons */}
          <View style={addSt.navRow}>
            {step > 1 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => goToStep(step - 1)}
                style={addSt.btnBack}>
                <Text style={addSt.btnBackTxt}>Atrás</Text>
              </TouchableOpacity>
            )}
            {step < 4 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={nextDisabled}
                onPress={() => goToStep(step + 1)}
                style={[
                  addSt.btnNext,
                  step === 1 && { flex: 1 },
                  nextDisabled && addSt.btnDisabled,
                ]}>
                <Text style={[addSt.btnNextTxt, nextDisabled && addSt.btnDisabledTxt]}>
                  Siguiente
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!nombre.trim()}
                onPress={handleSave}
                style={[addSt.btnSave, !nombre.trim() && addSt.btnDisabled]}>
                <Text style={[addSt.btnSaveTxt, !nombre.trim() && addSt.btnDisabledTxt]}>
                  Guardar Tarjeta
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Payment Gateway Modal ─────────────────────────────────────────────────────

export interface PaymentGatewayModalProps {
  visible: boolean;
  espacio: Espacio | null;
  fecha: string;
  cantidad: number;
  total: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  visible,
  espacio,
  fecha,
  cantidad,
  total,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [metodoPago, setMetodoPago] = useState<'tarjeta' | 'wallet'>('tarjeta');
  const [procesando, setProcesando] = useState(false);
  const [pagoOk, setPagoOk] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>(INITIAL_CARDS);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [showAddCard, setShowAddCard] = useState(false);
  const [facturaNombre, setFacturaNombre] = useState('');
  const [facturaId, setFacturaId] = useState('');
  const [facturaEmail, setFacturaEmail] = useState('');
  const [facturaDireccion, setFacturaDireccion] = useState('');
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setMetodoPago('tarjeta');
      setProcesando(false);
      setPagoOk(false);
      setFacturaNombre('');
      setFacturaId('');
      setFacturaEmail('');
      setFacturaDireccion('');
      successOpacity.setValue(0);
    }
  }, [visible, successOpacity]);

  const handlePagar = useCallback(() => {
    setProcesando(true);
    setTimeout(() => {
      setProcesando(false);
      setPagoOk(true);
      Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      setTimeout(onSuccess, 2500);
    }, 2200);
  }, [onSuccess, successOpacity]);

  const handleAddCard = useCallback((card: SavedCard) => {
    setCards((prev) => [...prev, card]);
    setSelectedId(card.id);
    setShowAddCard(false);
  }, []);

  if (!espacio) return null;

  return (
    <>
      <AddCardModal
        visible={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSave={handleAddCard}
      />

      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={procesando ? undefined : onClose}>
        <View style={[pgSt.container, { paddingTop: insets.top }]}>

          {/* Header */}
          <View style={pgSt.header}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={procesando}
              onPress={onClose}
              style={pgSt.headerBtn}>
              <ArrowLeftIcon
                size={20}
                color={procesando ? Colors.gray500 : Colors.white}
                strokeWidth={2.5}
              />
            </TouchableOpacity>
            <Text style={pgSt.headerTitle}>Completar Pago</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Scrollable body */}
          <ScrollView
            contentContainerStyle={[pgSt.scroll, { paddingBottom: insets.bottom + 110 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Booking summary */}
            <View style={pgSt.card}>
              <Text style={pgSt.sectionTitle}>Resumen de la reserva</Text>
              <View style={pgSt.summaryRow}>
                <Image
                  source={{ uri: espacio.imagen }}
                  style={pgSt.summaryImg}
                  contentFit="cover"
                />
                <View style={pgSt.summaryInfo}>
                  <Text style={pgSt.summaryName} numberOfLines={1}>
                    {espacio.nombre}
                  </Text>
                  <Text style={pgSt.summarySubcat}>{espacio.subcategoria}</Text>
                  <View style={pgSt.summaryMeta}>
                    <Text style={pgSt.summaryMetaTxt}>{fecha}</Text>
                    <Text style={pgSt.summaryMetaTxt}>
                      {cantidad} {espacio.unidad}(s)
                    </Text>
                  </View>
                </View>
              </View>
              <View style={pgSt.summaryDivider} />
              <View style={pgSt.summaryTotalRow}>
                <Text style={pgSt.summaryTotalLabel}>Monto total a debitar:</Text>
                <Text style={pgSt.summaryTotalAmt}>${total}</Text>
              </View>
            </View>

            {/* Payment method selector */}
            <View style={pgSt.sectionBlock}>
              <Text style={pgSt.sectionTitle}>Método de pago</Text>
              <View style={pgSt.methodRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[pgSt.methodBtn, metodoPago === 'tarjeta' && pgSt.methodBtnActive]}
                  onPress={() => setMetodoPago('tarjeta')}>
                  <Text style={pgSt.methodIcon}>💳</Text>
                  <Text
                    style={[
                      pgSt.methodLabel,
                      metodoPago === 'tarjeta' && pgSt.methodLabelActive,
                    ]}>
                    Tarjeta Física
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[pgSt.methodBtn, metodoPago === 'wallet' && pgSt.methodBtnActive]}
                  onPress={() => setMetodoPago('wallet')}>
                  <Text style={pgSt.methodIcon}>📱</Text>
                  <Text
                    style={[
                      pgSt.methodLabel,
                      metodoPago === 'wallet' && pgSt.methodLabelActive,
                    ]}>
                    Digital Wallet
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── Tarjeta Física ── */}
              {metodoPago === 'tarjeta' && (
                <View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={pgSt.cardsScroll}>
                    {cards.map((card) => {
                      const sel = card.id === selectedId;
                      return (
                        <TouchableOpacity
                          key={card.id}
                          activeOpacity={0.85}
                          onPress={() => setSelectedId(card.id)}
                          style={[
                            pgSt.savedCard,
                            { backgroundColor: card.cardBgColor },
                            sel && pgSt.savedCardSelected,
                          ]}>
                          {sel && (
                            <View style={pgSt.cardCheck}>
                              <CheckIcon size={10} color={Colors.accentTeal} strokeWidth={3} />
                            </View>
                          )}
                          <View style={pgSt.cardTopRow}>
                            <View>
                              <Text style={pgSt.cardSavedLabel}>Tarjeta Guardada</Text>
                              <Text style={pgSt.cardNumMasked}>
                                {'•••• •••• •••• ' + card.numero.slice(-4)}
                              </Text>
                            </View>
                            <Text style={pgSt.cardTypeTxt}>
                              {card.tipo === 'visa' ? 'VISA' : 'MC'}
                            </Text>
                          </View>
                          <View style={pgSt.cardBotRow}>
                            <View>
                              <Text style={pgSt.cardInfoLabel}>Titular</Text>
                              <Text style={pgSt.cardInfoVal} numberOfLines={1}>
                                {card.nombre}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={pgSt.cardInfoLabel}>Vence</Text>
                              <Text style={pgSt.cardInfoVal}>{card.fecha}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowAddCard(true)}
                    style={pgSt.addCardBtn}>
                    <PlusIcon size={16} color={Colors.primaryDark} strokeWidth={2.5} />
                    <Text style={pgSt.addCardTxt}>Agregar nueva tarjeta bancaria</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Digital Wallet ── */}
              {metodoPago === 'wallet' && (
                <View style={pgSt.walletBox}>
                  <Text style={pgSt.walletHint}>
                    Paga rápido de forma segura utilizando la billetera digital registrada en tu
                    dispositivo móvil.
                  </Text>
                  <TouchableOpacity activeOpacity={0.85} style={pgSt.applePayBtn}>
                    <Text style={pgSt.applePayTxt}> Pay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.85} style={pgSt.googlePayBtn}>
                    <Text style={pgSt.googlePayTxt}>G Pay</Text>
                  </TouchableOpacity>
                  <Text style={pgSt.walletNote}>Detección biométrica automatizada activa</Text>
                </View>
              )}
            </View>

            {/* Billing data */}
            <View style={pgSt.sectionBlock}>
              <Text style={pgSt.sectionTitle}>Datos para facturación</Text>
              <View style={pgSt.billingCard}>
                <Text style={pgSt.inputLabel}>Nombre Completo o Razón Social</Text>
                <TextInput
                  value={facturaNombre}
                  onChangeText={setFacturaNombre}
                  placeholder="Ej. Mariana de los Ángeles"
                  placeholderTextColor={Colors.gray400}
                  style={pgSt.billingInput}
                  selectionColor={Colors.accentTeal}
                />

                <View style={pgSt.billingRow}>
                  <View style={pgSt.billingHalf}>
                    <Text style={pgSt.inputLabel}>Identificación / RUC</Text>
                    <TextInput
                      value={facturaId}
                      onChangeText={setFacturaId}
                      placeholder="0987654321001"
                      placeholderTextColor={Colors.gray400}
                      keyboardType="number-pad"
                      style={pgSt.billingInput}
                      selectionColor={Colors.accentTeal}
                    />
                  </View>
                  <View style={[pgSt.billingHalf, { marginLeft: Spacing.sm }]}>
                    <Text style={pgSt.inputLabel}>Correo Electrónico</Text>
                    <TextInput
                      value={facturaEmail}
                      onChangeText={setFacturaEmail}
                      placeholder="correo@ejemplo.com"
                      placeholderTextColor={Colors.gray400}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={pgSt.billingInput}
                      selectionColor={Colors.accentTeal}
                    />
                  </View>
                </View>

                <Text style={pgSt.inputLabel}>Dirección Legal</Text>
                <TextInput
                  value={facturaDireccion}
                  onChangeText={setFacturaDireccion}
                  placeholder="Calle, Ciudad, Provincia"
                  placeholderTextColor={Colors.gray400}
                  style={pgSt.billingInput}
                  selectionColor={Colors.accentTeal}
                />
              </View>
            </View>

            {/* SSL notice */}
            <View style={pgSt.sslRow}>
              <Text style={pgSt.sslTxt}>🔒  Conexión encriptada SSL de 256 bits</Text>
            </View>

          </ScrollView>

          {/* Fixed pay button */}
          <View style={[pgSt.payContainer, { paddingBottom: insets.bottom + Spacing.sm }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={procesando || pagoOk}
              onPress={handlePagar}
              style={[pgSt.payBtn, procesando && pgSt.payBtnLoading]}>
              {procesando ? (
                <View style={pgSt.payBtnInner}>
                  <ActivityIndicator size="small" color={Colors.accentTeal} />
                  <Text style={pgSt.payBtnTxt}>Procesando Pago Seguro...</Text>
                </View>
              ) : pagoOk ? (
                <Text style={pgSt.payBtnTxt}>¡Pago Exitoso!</Text>
              ) : (
                <Text style={pgSt.payBtnTxt}>Pagar ${total}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Payment success overlay */}
          {pagoOk && (
            <Animated.View style={[pgSt.successOverlay, { opacity: successOpacity }]}>
              <View style={pgSt.successIconWrap}>
                <CheckIcon size={56} color={Colors.accentTeal} strokeWidth={3} />
              </View>
              <Text style={pgSt.successTitle}>¡Pago Autorizado!</Text>
              <Text style={pgSt.successSubtitle}>
                Tu transacción ha sido procesada de manera segura. Hemos enviado el comprobante a
                tu email.
              </Text>
              <View style={pgSt.successDetails}>
                <View style={pgSt.successRow}>
                  <Text style={pgSt.successRowLabel}>Monto Debitado:</Text>
                  <Text style={pgSt.successRowVal}>${total}</Text>
                </View>
                <View style={pgSt.successRow}>
                  <Text style={pgSt.successRowLabel}>Fecha del Evento:</Text>
                  <Text style={pgSt.successRowVal}>{fecha}</Text>
                </View>
              </View>
              <Text style={pgSt.successRedirect}>Redirigiendo a tus Reservas...</Text>
            </Animated.View>
          )}

        </View>
      </Modal>
    </>
  );
};

export default PaymentGatewayModal;

// ─── AddCardModal Styles ───────────────────────────────────────────────────────

const addSt = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
  },
  headerBtn: {
    padding: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    marginHorizontal: Spacing.sm,
  },
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  progressBox: {
    gap: Spacing.xs,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accentTeal,
    borderRadius: BorderRadius.full,
  },
  cardWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  card: {
    width: 288,
    height: 176,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    width: 40,
    height: 32,
    backgroundColor: '#D4A017',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 30,
    height: 24,
    gap: 2,
  },
  chipCell: {
    width: 8,
    height: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  cardTypeTxt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.accentTeal,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  cardNumber: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardFooterLeft: {
    flex: 1,
  },
  cardFooterRight: {
    alignItems: 'flex-end',
  },
  cardFieldLabel: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardFieldValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  magStrip: {
    width: '100%',
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.8)',
    marginHorizontal: -Spacing.lg,
    width: 288 + Spacing.lg * 2,
    alignSelf: 'center',
  },
  cvvRow: {
    paddingHorizontal: Spacing.xs,
  },
  signaturePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    height: 32,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.xs,
  },
  sigLines: {
    flex: 1,
    gap: 4,
  },
  sigLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  cvvBox: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  cvvText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  cardBackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBackNote: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.4)',
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  formLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  formHint: {
    fontSize: 11,
    color: Colors.gray500,
    marginTop: -Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  inputCenter: {
    textAlign: 'center',
    letterSpacing: 4,
  },
  navRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  btnBack: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBackTxt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  btnNext: {
    flex: 2,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  btnNextTxt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.accentTeal,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnSave: {
    flex: 2,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.accentTeal,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.accentTeal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  btnSaveTxt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  btnDisabled: {
    backgroundColor: Colors.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnDisabledTxt: {
    color: Colors.gray400,
  },
});

// ─── PaymentGatewayModal Styles ────────────────────────────────────────────────

const pgSt = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 6 },
    }),
  },
  headerBtn: {
    padding: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    marginHorizontal: Spacing.sm,
  },
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  // Summary card
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryImg: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
  },
  summaryInfo: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  summaryName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  summarySubcat: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.gray500,
  },
  summaryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryMetaTxt: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontWeight: FontWeight.medium,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontWeight: FontWeight.medium,
  },
  summaryTotalAmt: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
  },
  // Payment method
  sectionBlock: {
    gap: Spacing.sm,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  methodBtnActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  methodIcon: {
    fontSize: FontSize.base,
  },
  methodLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray600,
  },
  methodLabelActive: {
    color: Colors.white,
  },
  // Saved cards
  cardsScroll: {
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  savedCard: {
    width: 256,
    height: 144,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  savedCardSelected: {
    borderColor: Colors.accentTeal,
  },
  cardCheck: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(20,184,166,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardSavedLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardNumMasked: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  cardTypeTxt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extraBold,
    color: Colors.accentTeal,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  cardBotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardInfoLabel: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardInfoVal: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    maxWidth: 130,
  },
  addCardBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(30,58,95,0.3)',
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(30,58,95,0.04)',
  },
  addCardTxt: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  // Wallet
  walletBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    gap: Spacing.md,
  },
  walletHint: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 240,
  },
  applePayBtn: {
    width: '100%',
    maxWidth: 260,
    backgroundColor: Colors.black,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  applePayTxt: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  googlePayBtn: {
    width: '100%',
    maxWidth: 260,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  googlePayTxt: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    letterSpacing: 0.5,
  },
  walletNote: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontVariant: ['tabular-nums'],
  },
  // Billing
  billingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -Spacing.xs + 2,
  },
  billingInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
  },
  billingRow: {
    flexDirection: 'row',
  },
  billingHalf: {
    flex: 1,
    gap: Spacing.xs,
  },
  // SSL
  sslRow: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  sslTxt: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
  },
  // Fixed pay button
  payContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  payBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  payBtnLoading: {
    backgroundColor: Colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  payBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  payBtnTxt: {
    color: Colors.accentTeal,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(20,184,166,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extraBold,
    color: Colors.white,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.teal200,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    maxWidth: 260,
  },
  successDetails: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  successRowLabel: {
    fontSize: FontSize.xs,
    color: Colors.teal200,
    fontWeight: FontWeight.semiBold,
  },
  successRowVal: {
    fontSize: FontSize.xs,
    color: Colors.accentTeal,
    fontWeight: FontWeight.bold,
  },
  successRedirect: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontVariant: ['tabular-nums'],
  },
});
