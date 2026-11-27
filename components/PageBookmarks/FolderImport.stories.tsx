import FolderImport from './FolderImport';
import { buildMessages } from '@/hooks/useMessages';
import { BookmarksFolderAscendancyRangerIcon } from '@/types/bookmarks';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { ImportedFolder } from './FolderImport';
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta<typeof FolderImport> = {
  title: 'Pages/PageBookmarks/FolderImport',
  component: FolderImport,
  args: { onCancel: fn(), onSubmit: fn(async () => {}) },
};

type Story = StoryObj<typeof FolderImport>;

// Sample build data, not UI strings: Loadout titles come from the Build Code as written in Path of Building
const STAGES: [string, number][] = [
  ['Hour 3 (lvl 43)', 9],
  ['Hour 6 (lvl 67)', 6],
  ['Hour 12 (lvl 93)', 12],
  ['Day 1 (lvl 94)', 3],
  ['Day 6 (lvl 95)', 1],
];
const trade = (index: number) => ({
  title: `Trade ${index + 1}`,
  location: { version: '1' as const, type: 'search', slug: `slug-${index}` },
  completedAt: null,
});
const LOADOUT_FOLDERS: ImportedFolder[] = STAGES.map(([stage, count]) => ({
  folder: {
    title: `Venom Gyre — ${stage}`,
    version: '1',
    icon: BookmarksFolderAscendancyRangerIcon.DEADEYE,
    archivedAt: null,
  },
  trades: Array.from({ length: count }, (_, index) => trade(index)),
}));

/** A PoB import with one Folder per Loadout: every Folder is previewed, and one Save creates them all */
export const PobOneFolderPerLoadout: Story = {
  render: args => {
    const messages = buildMessages().pageBookmarks;
    return (
      <FolderImport
        {...args}
        modalTitle={messages.importPobModalTitle}
        modalCloseLabel={messages.modalCloseLabel}
        logoAlt={messages.logoAlt}
        importCodeLabel={messages.importPobCodeLabel}
        previewLabel={messages.importPreviewLabel}
        invalidCodeMessage={messages.invalidPobCodeMessage}
        saveLabel={messages.saveLabel}
        onDeserialize={input => (input.trim() ? LOADOUT_FOLDERS : null)}
      />
    );
  },
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const messages = buildMessages().pageBookmarks;
    await userEvent.type(body.getByLabelText(messages.importPobCodeLabel), 'eNrtWV...');
    for (const { folder, trades } of LOADOUT_FOLDERS) {
      await expect(await body.findByText(messages.importPreviewLabel(folder.title, trades.length))).toBeVisible();
    }
    await userEvent.click(body.getByRole('button', { name: messages.saveLabel }));
    await expect(args.onSubmit).toHaveBeenCalledWith(LOADOUT_FOLDERS);
  },
};

export default meta;
