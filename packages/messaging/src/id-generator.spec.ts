import { describe, expect, it } from 'vitest';

import { UuidV5IdGenerator } from './id-generator';

// Namespace DNS da RFC 4122, com um vetor publicado: e o que prova que a implementacao e
// um uuid v5 de verdade, e nao um hash com cara de uuid.
const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const APP_NAMESPACE = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e00';

describe('UuidV5IdGenerator', () => {
  it('reproduz o vetor conhecido da RFC 4122', () => {
    const ids = new UuidV5IdGenerator(DNS_NAMESPACE);

    expect(ids.derive('example.com')).toBe('cfbff0d1-9375-5685-968c-48ce8b15ae17');
  });

  it('devolve o mesmo id para a mesma origem, em instancias diferentes', () => {
    const seed = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e01';

    expect(new UuidV5IdGenerator(APP_NAMESPACE).derive(seed)).toBe(
      new UuidV5IdGenerator(APP_NAMESPACE).derive(seed),
    );
  });

  it('separa origens diferentes', () => {
    const ids = new UuidV5IdGenerator(APP_NAMESPACE);

    expect(ids.derive('origem-a')).not.toBe(ids.derive('origem-b'));
  });

  it('separa namespaces diferentes para a mesma origem', () => {
    const other = '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e99';

    expect(new UuidV5IdGenerator(APP_NAMESPACE).derive('origem-a')).not.toBe(
      new UuidV5IdGenerator(other).derive('origem-a'),
    );
  });

  it('recusa namespace que nao e uuid', () => {
    expect(() => new UuidV5IdGenerator('namespace-qualquer')).toThrow(
      'namespace do uuid v5 precisa ser um uuid',
    );
  });
});
