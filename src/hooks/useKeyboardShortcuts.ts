import { useEffect } from 'react';

interface ShortcutHandlers {
  onTogglePanel: () => void;
  onToggleMute: () => void;
  onAdjustDistance: (delta: number) => void;
  onAdjustLateral: (delta: number) => void;
  onSelectScenario?: (index: number) => void;
  onTogglePlayPause?: () => void;
  onToggleCalibration?: () => void;
}

export function useKeyboardShortcuts({
  onTogglePanel,
  onToggleMute,
  onAdjustDistance,
  onAdjustLateral,
  onTogglePlayPause,
  onToggleCalibration,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing inside an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          onTogglePanel();
          break;
        case 'm':
          e.preventDefault();
          onToggleMute();
          break;
        case 'c':
          e.preventDefault();
          onToggleCalibration?.();
          break;
        case ' ':
          e.preventDefault();
          onTogglePlayPause?.();
          break;
        case 'arrowup':
          e.preventDefault();
          onAdjustDistance(1.5); // Increase distance (move car farther)
          break;
        case 'arrowdown':
          e.preventDefault();
          onAdjustDistance(-1.5); // Decrease distance (move car closer)
          break;
        case 'arrowleft':
          e.preventDefault();
          onAdjustLateral(-1.5); // Move car left
          break;
        case 'arrowright':
          e.preventDefault();
          onAdjustLateral(1.5); // Move car right
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onTogglePanel,
    onToggleMute,
    onAdjustDistance,
    onAdjustLateral,
    onTogglePlayPause,
    onToggleCalibration,
  ]);
}
