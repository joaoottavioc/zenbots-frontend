import { reducer } from './use-toast';

type ToasterToast = {
  id: string;
  open?: boolean;
  title?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
};

type State = {
  toasts: ToasterToast[];
};

type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> & { id: string } }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string };

const makeToast = (id: string, overrides: Partial<ToasterToast> = {}): ToasterToast => ({
  id,
  open: true,
  title: `Toast ${id}`,
  ...overrides,
});

// Helper to call the reducer with our local types
const callReducer = (state: State, action: Action): State =>
  reducer(state as Parameters<typeof reducer>[0], action as Parameters<typeof reducer>[1]);

describe('use-toast reducer', () => {
  describe('ADD_TOAST', () => {
    it('adds a toast to empty state', () => {
      const state: State = { toasts: [] };
      const result = callReducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('1'),
      });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('1');
    });

    it('enforces TOAST_LIMIT of 1', () => {
      const state: State = { toasts: [makeToast('1')] };
      const result = callReducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('2'),
      });
      // TOAST_LIMIT = 1, new toast comes first, old gets sliced
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });

    it('puts new toast at the beginning', () => {
      const state: State = { toasts: [] };
      let result = callReducer(state, { type: 'ADD_TOAST', toast: makeToast('1') });
      result = callReducer(result, { type: 'ADD_TOAST', toast: makeToast('2') });
      expect(result.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates a toast by id', () => {
      const state: State = { toasts: [makeToast('1', { title: 'Old' })] };
      const result = callReducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'New' },
      });
      expect(result.toasts[0].title).toBe('New');
    });

    it('does not affect other toasts', () => {
      const state: State = { toasts: [makeToast('1', { title: 'Keep' })] };
      const result = callReducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '999', title: 'Nope' },
      });
      expect(result.toasts[0].title).toBe('Keep');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open to false for a specific toast', () => {
      const state: State = { toasts: [makeToast('1', { open: true })] };
      const result = callReducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });
      expect(result.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when no toastId', () => {
      const state: State = {
        toasts: [
          makeToast('1', { open: true }),
        ],
      };
      const result = callReducer(state, { type: 'DISMISS_TOAST' });
      expect(result.toasts.every((t: ToasterToast) => t.open === false)).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes a specific toast by id', () => {
      const state: State = { toasts: [makeToast('1')] };
      const result = callReducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });
      expect(result.toasts).toHaveLength(0);
    });

    it('removes all toasts when no toastId', () => {
      const state: State = { toasts: [makeToast('1')] };
      const result = callReducer(state, { type: 'REMOVE_TOAST' });
      expect(result.toasts).toHaveLength(0);
    });
  });
});
