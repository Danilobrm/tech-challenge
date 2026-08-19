import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('nasce como botao de acao, e nao de envio', () => {
    render(<Button>Filtrar</Button>);

    expect(screen.getByRole('button', { name: 'Filtrar' })).toHaveProperty('type', 'button');
  });

  it('envia o formulario quando pedido explicitamente', () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });

    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Aplicar</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('nao dispara quando desabilitado', () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Aplicar
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
