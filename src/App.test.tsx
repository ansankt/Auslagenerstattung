import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds an expense row', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Ausgabe hinzufügen' }));

    expect(screen.getByText('Ausgabe 2')).toBeInTheDocument();
  });

  it('offers receipt recognition for expenses', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Beleg erkennen' })).toBeInTheDocument();
  });

  it('offers multi receipt import', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Belege importieren' })).toBeInTheDocument();
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

  it('moves to the next expense field with Enter', async () => {
    render(<App />);

    const dateField = screen.getByLabelText('Datum');
    dateField.focus();
    await userEvent.keyboard('{Enter}');

    expect(screen.getByLabelText('Beleg')).toHaveFocus();
  });

  it('adds a new expense row when tabbing after the last editable expense field', async () => {
    render(<App />);

    const vatField = screen.getByLabelText('MwSt.');
    vatField.focus();
    await userEvent.keyboard('{Tab}');

    await waitFor(() => expect(screen.getByText('Ausgabe 2')).toBeInTheDocument());
    expect(screen.getAllByLabelText('Datum')[1]).toHaveFocus();
  });
});
