import React from 'react';
import { DatabaseState } from '../../db/localDatabase';
import { TaxDeclarationRecord } from '../../types';
import { UnifiedTaxFilingAgendaView } from './UnifiedTaxFilingAgendaView';

interface TaxFilingCredentialsGridViewProps {
  state: DatabaseState;
  onOpenPdfModal?: (decl: TaxDeclarationRecord) => void;
  onOpenInvoicesHarmonizer?: (clientId?: string) => void;
}

export const TaxFilingCredentialsGridView: React.FC<TaxFilingCredentialsGridViewProps> = ({
  state,
  onOpenPdfModal,
  onOpenInvoicesHarmonizer,
}) => {
  return (
    <UnifiedTaxFilingAgendaView
      state={state}
      onOpenPdfModal={onOpenPdfModal}
      onOpenInvoicesHarmonizer={onOpenInvoicesHarmonizer}
    />
  );
};

export default React.memo(TaxFilingCredentialsGridView);
