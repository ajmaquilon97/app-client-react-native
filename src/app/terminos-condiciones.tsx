import React from 'react';
import LegalDocumentScreen from '@/components/legal/LegalDocumentScreen';
import {
  TERMINOS_CONDICIONES_TEXT,
  TERMINOS_CONDICIONES_VERSION,
  TERMINOS_CONDICIONES_FECHA,
} from '@/constants/legalContent';

export default function TerminosCondicionesScreen() {
  return (
    <LegalDocumentScreen
      title="Términos y Condiciones"
      versionLabel={`Versión ${TERMINOS_CONDICIONES_VERSION} · Última actualización: ${TERMINOS_CONDICIONES_FECHA}`}
      content={TERMINOS_CONDICIONES_TEXT}
    />
  );
}
