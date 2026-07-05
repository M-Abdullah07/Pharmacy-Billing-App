// H4: tiny dependency-free argument-shape validator for money-mutating IPC
// handlers. Rules: 'string' | 'number' | 'number>=0' | 'boolean' | 'array',
// each optionally suffixed with '?' to allow undefined/null.
// assertShape(data, { amount: 'number>=0', items: 'array' }) throws on the
// first violation.

function checkField(value, rule, key) {
  const optional = rule.endsWith("?");
  const base = optional ? rule.slice(0, -1) : rule;

  if (value === undefined || value === null) {
    if (optional) return;
    throw new Error(`${key} is required.`);
  }

  if (base === "string") {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${key} must be a non-empty string.`);
    }
  } else if (base === "number" || base === "number>=0") {
    const n = Number(value);
    if (typeof value === "boolean" || !Number.isFinite(n)) {
      throw new Error(`${key} must be a finite number.`);
    }
    if (base === "number>=0" && n < 0) {
      throw new Error(`${key} must not be negative.`);
    }
  } else if (base === "boolean") {
    if (typeof value !== "boolean") throw new Error(`${key} must be a boolean.`);
  } else if (base === "array") {
    if (!Array.isArray(value)) throw new Error(`${key} must be an array.`);
  } else {
    throw new Error(`Unknown validation rule '${rule}' for ${key}.`);
  }
}

function assertShape(data, shape) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Expected an object argument.");
  }
  for (const [key, rule] of Object.entries(shape)) {
    checkField(data[key], rule, key);
  }
}

export { assertShape };
