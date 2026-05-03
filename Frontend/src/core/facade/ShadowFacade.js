const SHADOW_MODE = (import.meta?.env?.VITE_SHADOW_MODE ?? '1') === '1';
const FACADE_AUDIT_MUTATIONS = (import.meta?.env?.VITE_FACADE_AUDIT_MUTATIONS ?? '0') === '1';

function isReadOperation(name) {
  return /^(get|list|find|search|load|fetch)/i.test(name);
}

function safeAuditArgsSummary(args) {
  try {
    return args.map((a) => {
      if (a == null) return a;
      if (typeof a === 'string') return a.length > 64 ? `${a.slice(0, 64)}…` : a;
      if (typeof a === 'number' || typeof a === 'boolean') return a;
      if (Array.isArray(a)) return { type: 'array', length: a.length };
      if (typeof a === 'object') return { type: 'object', keys: Object.keys(a).slice(0, 12) };
      return { type: typeof a };
    });
  } catch {
    return [{ type: 'unavailable' }];
  }
}

function isObject(v) {
  return v !== null && typeof v === 'object';
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!isObject(value)) return value;
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = stable(value[key]);
      return acc;
    }, {});
}

function deepEqual(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

export class ShadowFacade {
  constructor({ oldApi, newApi, onMismatch }) {
    this.oldApi = oldApi;
    this.newApi = newApi;
    this.onMismatch = onMismatch ?? ((payload) => console.error('[ShadowMismatch]', payload));
  }

  async route(name, ...args) {
    const oldFn = this.oldApi[name];
    const newFn = this.newApi[name];

    const hasOld = typeof oldFn === 'function';
    const hasNew = typeof newFn === 'function';

    if (!hasOld && !hasNew) throw new Error(`Facade op missing: ${name}`);

    // Writes must never dual-execute (prevents duplicate records like double-sale).
    if (!isReadOperation(name)) {
      if (FACADE_AUDIT_MUTATIONS) {
        console.info('[FacadeMutation]', {
          op: name,
          at: new Date().toISOString(),
          args: safeAuditArgsSummary(args),
        });
      }
      if (hasNew) return newFn(...args);
      return oldFn(...args);
    }

    // Reads can shadow-compare but always return the refactored implementation when available.
    if (!hasNew) return oldFn(...args);
    if (!SHADOW_MODE || !hasOld) return newFn(...args);

    const [oldRes, newRes] = await Promise.allSettled([oldFn(...args), newFn(...args)]);
    const oldOk = oldRes.status === 'fulfilled';
    const newOk = newRes.status === 'fulfilled';

    if (!oldOk || !newOk) {
      this.onMismatch({ fn: name, args, old: oldRes, newer: newRes, reason: 'throw-drift' });
      if (newOk) return newRes.value;
      if (oldOk) return oldRes.value;
      throw newRes.reason;
    }

    if (!deepEqual(oldRes.value, newRes.value)) {
      this.onMismatch({
        fn: name,
        args,
        reason: 'value-drift',
        old: oldRes.value,
        newer: newRes.value,
      });
    }

    return newRes.value;
  }
}
