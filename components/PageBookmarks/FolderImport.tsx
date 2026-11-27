import styles from './FolderImport.module.scss';
import SaveIcon from '@/assets/icons/filled/save.svg?react';
import AlertMessage from '@/components/AlertMessage';
import BookmarkFolderIcon from '@/components/BookmarkFolderIcon';
import Button from '@/components/Button';
import FormContainer from '@/components/FormContainer';
import FormInput from '@/components/FormInput';
import Modal from '@/components/Modal';
import { useRef, useState } from 'react';
import type { BookmarksFolderStruct, BookmarksTradeStruct } from '@/types/bookmarks';
import type React from 'react';

interface ImportedFolder {
  folder: BookmarksFolderStruct;
  trades: BookmarksTradeStruct[];
}

interface FolderImportProps {
  modalTitle: string;
  modalCloseLabel: string;
  logoAlt: string;
  importCodeLabel: string;
  previewLabel: (name: string, tradesCount: number) => string;
  invalidCodeMessage: string;
  saveLabel: string;
  onCancel: () => void;
  /** Every Folder previewed, in order */
  onSubmit: (folders: ImportedFolder[]) => Promise<void>;
  onDeserialize: (input: string) => ImportedFolder[] | null | Promise<ImportedFolder[] | null>;
}

const FolderImport: React.FC<FolderImportProps> = ({
  modalTitle,
  modalCloseLabel,
  logoAlt,
  importCodeLabel,
  previewLabel,
  invalidCodeMessage,
  saveLabel,
  onCancel,
  onSubmit,
  onDeserialize,
}) => {
  const [stagedFolders, setStagedFolders] = useState<ImportedFolder[]>([]);
  const [isInvalid, setIsInvalid] = useState(false);

  const canSubmit = stagedFolders.length > 0;

  // An async deserialization may finish after a newer input's: only the latest input's result counts
  const latestInput = useRef('');

  const handleInput = async (input: string) => {
    latestInput.current = input;
    const result = await onDeserialize(input);
    if (latestInput.current !== input) return;

    setIsInvalid(!result?.length);
    setStagedFolders(result ?? []);
  };

  return (
    <Modal title={modalTitle} closeLabel={modalCloseLabel} logoAlt={logoAlt} onClose={onCancel} isOpen={true}>
      <FormContainer
        onSubmit={() => {
          if (canSubmit) return onSubmit(stagedFolders);
        }}
        canSubmit={canSubmit}>
        <FormInput label={importCodeLabel} value="" autofocus={true} onChange={handleInput} />

        {stagedFolders.length > 0 && (
          <ul className={styles.importPreviews}>
            {stagedFolders.map(({ folder, trades }, index) => (
              <li key={index} className={styles.importPreview}>
                {folder.icon && <BookmarkFolderIcon icon={folder.icon} />}
                <div className={styles.importPreviewTitle}>{previewLabel(folder.title, trades.length)}</div>
              </li>
            ))}
          </ul>
        )}

        {isInvalid && <AlertMessage message={invalidCodeMessage} type="alert" />}

        <Button type="submit" theme="gold" label={saveLabel} icon={SaveIcon} />
      </FormContainer>
    </Modal>
  );
};

export type { ImportedFolder };
export default FolderImport;
