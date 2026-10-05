import React from 'react';
import { DatabaseState } from '../db/localDatabase';
import { UnifiedTaxFilingAgendaView } from './tax/UnifiedTaxFilingAgendaView';

interface TaxTrackerViewProps {
  state: DatabaseState;
}

export const TaxTrackerView: React.FC<TaxTrackerViewProps> = ({ state }) => {
  return <UnifiedTaxFilingAgendaView state={state} />;
};

export default React.memo(TaxTrackerView);
