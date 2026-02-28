import { reducer } from './use-toast';

type ToasterToast = {
  id: string;
  open?: boolean;
  title?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
};

const makeToast = (id: string, overrides: Partial<ToasterToast> = {}): ToasterToast => ({
  id,
  open: true,
  title: `Toast ${id}`,
  ...overrides,
});

describe('use-toast reducer', () => {
  describe('ADD_TOAST', () => {
    it('adds a toast to empty state', () => {
      const state = { toasts: [] };
      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('1') as any,
      });
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('1');
    });

    it('enforces TOAST_LIMIT of 1', () => {
      const state = { toasts: [makeToast('1') as any] };
      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('2') as any,
      });
      // TOAST_LIMIT = 1, new toast comes first, old gets sliced
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });

    it('puts new toast at the beginning', () => {
      const state = { toasts: [] };
      let result = reducer(state, { type: 'ADD_TOAST', toast: makeToast('1') as any });
      result = reducer(result, { type: 'ADD_TOAST', toast: makeToast('2') as any });
      expect(result.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates a toast by id', () => {
      const state = { toasts: [makeToast('1', { title: 'Old' }) as any] };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'New' },
      });
      expect(result.toasts[0].title).toBe('New');
    });

    it('does not affect other toasts', () => {
      const state = { toasts: [makeToast('1', { title: 'Keep' }) as any] };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '999', title: 'Nope' },
      });
      expect(result.toasts[0].title).toBe('Keep');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open to false for a specific toast', () => {
      const state = { toasts: [makeToast('1', { open: true }) as any] };
      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      });
      expect(result.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when no toastId', () => {
      const state = {
        toasts: [
          makeToast('1', { open: true }) as any,
        ],
      };
      const result = reducer(state, { type: 'DISMISS_TOAST' });
      expect(result.toasts.every((t: any) => t.open === false)).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes a specific toast by id', () => {
      const state = { toasts: [makeToast('1') as any] };
      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      });
      expect(result.toasts).toHaveLength(0);
    });

    it('removes all toasts when no toastId', () => {
      const state = { toasts: [makeToast('1') as any] };
      const result = reducer(state, { type: 'REMOVE_TOAST' });
      expect(result.toasts).toHaveLength(0);
    });
  });
});
