import React from 'react';
import { Play } from 'lucide-react';
import { useI18n } from '../i18n';

interface MockDriveControlsProps {
  onStart: () => void;
}

export const MockDriveControls: React.FC<MockDriveControlsProps> = ({ onStart }) => {
  const { t } = useI18n();

  return (
    <div className="mock-drive-panel-simple">
      <button className="mock-drive-start-btn" onClick={onStart}>
        <Play size={16} fill="currentColor" />
        {t('startMockDriveTest')}
      </button>
    </div>
  );
};
