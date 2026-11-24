import type React from 'react';

/**
 * Checks whether an Enter keydown event should submit a form/input safely,
 * preventing premature submission during IME character composition (including Safari keyCode 229).
 */
export function handleImeSafeEnterSubmit(
  event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  options: { multiline?: boolean; onSubmit: () => void }
): void {
  if (event.key !== 'Enter') return;
  if (options.multiline && event.shiftKey) return;

  event.preventDefault();

  const nativeEvent = event.nativeEvent as KeyboardEvent;
  if (nativeEvent.isComposing || nativeEvent.keyCode === 229) {
    return;
  }

  options.onSubmit();
}
