import React from 'react';
import { LegalDocumentScreen ,
  POLITICA_PRIVACIDAD_TEXT,
  POLITICA_PRIVACIDAD_VERSION,
  POLITICA_PRIVACIDAD_FECHA,
} from '@/features/legal';

export default function PoliticaPrivacidadScreen() {
  return (
    <LegalDocumentScreen
      title="Política de Privacidad"
      versionLabel={`Versión ${POLITICA_PRIVACIDAD_VERSION} · Última actualización: ${POLITICA_PRIVACIDAD_FECHA}`}
      content={POLITICA_PRIVACIDAD_TEXT}
    />
  );
}
