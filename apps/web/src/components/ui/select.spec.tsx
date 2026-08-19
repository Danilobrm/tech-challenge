import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Select } from '@/components/ui/select';

describe('Select', () => {
  it('continua sendo um select de verdade depois de estilizado', () => {
    render(
      <Select aria-label="Status" defaultValue="approved">
        <option value="">Todos</option>
        <option value="approved">Aprovada</option>
      </Select>,
    );

    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveProperty('value', 'approved');
  });

  it('esconde a seta desenhada de quem le por leitor de tela', () => {
    const { container } = render(
      <Select aria-label="Status">
        <option value="">Todos</option>
      </Select>,
    );

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
