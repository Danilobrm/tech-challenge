import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Desmonta a arvore renderizada entre os casos. Sem isso o `screen` enxerga tambem o render
// anterior, e a consulta por papel falha por encontrar dois elementos iguais.
afterEach(() => {
  cleanup();
});
