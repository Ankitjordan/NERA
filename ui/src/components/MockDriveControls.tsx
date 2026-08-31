import React from 'react';
import { Play } from 'lucide-react';

interface MockDriveControlsProps {
  onStart: () => void;
}

export const MockDriveControls: React.FC<MockDriveControlsProps> = ({ onStart }) => {
  return (
    <div className="mock-drive-panel-simple">
      <button className="mock-drive-start-btn" onClick={onStart}>
        <Play size={16} fill="currentColor" />
        Start Mock Drive Test
      </button>
    </div>
  );
};
