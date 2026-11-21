import styles from './Backup.module.scss';
import RestoreFileIcon from '@/assets/icons/filled/restore-file.svg?react';
import FileExportIcon from '@/assets/icons/solid/file-export.svg?react';
import Button from '@/components/Button';
import { useFlashMessagesContext } from '@/contexts/FlashMessagesContext';
import { useBookmarks } from '@/hooks/useBookmarks';
import type React from 'react';

interface BackupProps {
  generateButtonLabel: string;
  restoreButtonLabel: string;
  restoreErrorMessage: string;
}

/**
 * Saves all bookmarks to a file and restores them from one
 */
const Backup: React.FC<BackupProps> = ({ generateButtonLabel, restoreButtonLabel, restoreErrorMessage }) => {
  const { generateBackup, restoreBackup } = useBookmarks();
  const { addFlash } = useFlashMessagesContext();

  const handleGenerateBackup = async () => {
    const dataString = await generateBackup();
    const linkElement = document.createElement('a');
    linkElement.download = 'poe-better-trading-backup.txt';
    linkElement.href = window.URL.createObjectURL(new Blob([dataString], { type: 'text/plain' }));
    linkElement.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Let the same file be picked again, e.g. after a failed restore
    event.target.value = '';
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const success = await restoreBackup(fileReader.result as string).catch(() => false);
      if (!success) addFlash(restoreErrorMessage, 'alert');
    };
    fileReader.readAsText(file);
  };

  return (
    <div className={styles.actions}>
      <Button onClick={handleGenerateBackup} theme="blue" icon={FileExportIcon} label={generateButtonLabel} />
      <Button
        onFileChange={handleFileChange}
        theme="blue"
        fileAccept="text/plain"
        icon={RestoreFileIcon}
        label={restoreButtonLabel}
      />
    </div>
  );
};

export default Backup;
