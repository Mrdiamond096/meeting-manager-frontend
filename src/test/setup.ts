import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// findBy* waits 1s by default; debounced searches miss it when the whole suite runs in parallel on a busy machine.
configure({ asyncUtilTimeout: 3000 });

afterEach(cleanup);
