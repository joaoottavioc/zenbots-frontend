import { reducer } from './use-toast';

type ReducerState = Parameters<typeof reducer>[0];
type ReducerAction = Parameters<typeof reducer>[1];
type ToasterToast = ReducerState['toasts'][number];

const makeToast = (id: string, overrides: Partial<ToasterToast> = {}): ToasterToast => ({
  id,
  open: true,
  title: `Toast ${id}`,
  ...overrides,
} as ToasterToast);

describe('use-toast reducer', () => {
  describe('ADD_TOAST', () => {
    it('adds a toast to empty state', () => {
      const state: ReducerState = { toasts: [] };
      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('1'),
      } as ReducerAction);
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('1');
    });

    it('enforces TOAST_LIMIT of 1', () => {
      const state: ReducerState = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'ADD_TOAST',
        toast: makeToast('2'),
      } as ReducerAction);
      // TOAST_LIMIT = 1, new toast comes first, old gets sliced
      expect(result.toasts).toHaveLength(1);
      expect(result.toasts[0].id).toBe('2');
    });

    it('puts new toast at the beginning', () => {
      const state: ReducerState = { toasts: [] };
      let result = reducer(state, { type: 'ADD_TOAST', toast: makeToast('1') } as ReducerAction);
      result = reducer(result, { type: 'ADD_TOAST', toast: makeToast('2') } as ReducerAction);
      expect(result.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates a toast by id', () => {
      const state: ReducerState = { toasts: [makeToast('1', { title: 'Old' })] };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '1', title: 'New' },
      } as ReducerAction);
      expect(result.toasts[0].title).toBe('New');
    });

    it('does not affect other toasts', () => {
      const state: ReducerState = { toasts: [makeToast('1', { title: 'Keep' })] };
      const result = reducer(state, {
        type: 'UPDATE_TOAST',
        toast: { id: '999', title: 'Nope' },
      } as ReducerAction);
      expect(result.toasts[0].title).toBe('Keep');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open to false for a specific toast', () => {
      const state: ReducerState = { toasts: [makeToast('1', { open: true })] };
      const result = reducer(state, {
        type: 'DISMISS_TOAST',
        toastId: '1',
      } as ReducerAction);
      expect(result.toasts[0].open).toBe(false);
    });

    it('dismisses all toasts when no toastId', () => {
      const state: ReducerState = {
        toasts: [
          makeToast('1', { open: true }),
        ],
      };
      const result = reducer(state, { type: 'DISMISS_TOAST' } as ReducerAction);
      expect(result.toasts.every((t: ToasterToast) => t.open === false)).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes a specific toast by id', () => {
      const state: ReducerState = { toasts: [makeToast('1')] };
      const result = reducer(state, {
        type: 'REMOVE_TOAST',
        toastId: '1',
      } as ReducerAction);
      expect(result.toasts).toHaveLength(0);
    });

    it('removes all toasts when no toastId', () => {
      const state: ReducerState = { toasts: [makeToast('1')] };
      const result = reducer(state, { type: 'REMOVE_TOAST' } as ReducerAction);
      expect(result.toasts).toHaveLength(0);
    });
  });
});
