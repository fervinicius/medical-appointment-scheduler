import { KeyedMutex } from './keyed-mutex';

describe('KeyedMutex', () => {
  it('serializa operações com a mesma chave sem bloquear chaves diferentes', async () => {
    const mutex = new KeyedMutex();
    const order: string[] = [];
    const task = (label: string, delay: number) => mutex.runExclusive('doctor:date', async () => {
      order.push(`${label}-start`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      order.push(`${label}-end`);
    });
    await Promise.all([task('A', 10), task('B', 0)]);
    expect(order).toEqual(['A-start', 'A-end', 'B-start', 'B-end']);
  });
});
