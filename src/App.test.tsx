import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('adds an expense row', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Ausgabe hinzufügen' }));

    expect(screen.getByText('Ausgabe 2')).toBeInTheDocument();
  });

  it('shows bank fields when bank transfer is selected', async () => {
    render(<App />);

    await userEvent.click(screen.getByLabelText('Überweisung'));

    expect(screen.getByLabelText('Kontoinhaber')).toBeInTheDocument();
    expect(screen.getByLabelText('IBAN')).toBeInTheDocument();
  });

  it('validates before PDF creation', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'PDF herunterladen' }));

    expect(
      await screen.findByText('Bitte korrigiere die markierten Felder, bevor die PDF erstellt wird.'),
    ).toBeInTheDocument();
  });
});
