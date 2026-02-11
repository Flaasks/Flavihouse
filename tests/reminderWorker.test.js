import { retryAsync } from '../src/services/reminderWorker.js';
import { jest } from '@jest/globals';

test('retryAsync retries and succeeds', async () => {
  const calls = [];
  let attempt = 0;
  const fn = jest.fn().mockImplementation(() => {
    attempt++;
    calls.push(attempt);
    if (attempt < 3) {
      return Promise.reject(new Error('fail'));
    }
    return Promise.resolve('ok');
  });

  const p = retryAsync(fn, 3, 1000);

  // allow real timers to run for the backoff delays
  await new Promise((res) => setTimeout(res, 3100));
  const res = await p;
  expect(res).toBe('ok');
  expect(fn).toHaveBeenCalledTimes(3);
});

afterAll(() => {
  jest.useRealTimers();
});
