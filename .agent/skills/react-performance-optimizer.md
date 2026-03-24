# --- agentskill.sh ---
# slug: curiositech/react-performance-optimizer
# owner: curiositech
# contentSha: d20ee5d
# installed: 2026-03-24T05:49:27.873Z
# source: https://agentskill.sh/curiositech/react-performance-optimizer
#
# IMPORTANT: After this skill is used for the first time, assess how
# useful and functional it was, then rate it using:
#   /learn feedback curiositech/react-performance-optimizer <1-5> [optional comment]
# Your feedback helps surface the best skills for everyone.
# ---
---
name: react-performance-optimizer
description: Optimize React apps for 60fps performance. Implements memoization, virtualization, code splitting, bundle optimization. Use for slow renders, large lists, bundle bloat. Activate on "React performance",
  "slow render", "useMemo", "bundle size", "virtualization". NOT for backend optimization, non-React frameworks, or premature optimization.
allowed-tools: Read,Write,Edit,Bash(npm:*)
metadata:
  tags:
  - react
  - performance
  - optimizer
  - react-performance
  - slow-render
  pairs-with:
  - skill: performance-profiling
    reason: React profiling tools identify the re-render bottlenecks that optimization addresses
  - skill: nextjs-app-router-expert
    reason: RSC and streaming SSR in Next.js require React-specific performance strategies
  - skill: data-viz-2025
    reason: Data-heavy visualizations require React memoization and virtualization for smooth rendering
  - skill: reactive-dashboard-performance
    reason: Dashboard widgets with real-time data need the same React optimization patterns
---

# React Performance Optimizer

Expert in diagnosing and fixing React performance issues to achieve buttery-smooth 60fps experiences.

## When to Use

â **Use for**:
- Slow component re-renders
- Large lists (&gt;100 items) causing lag
- Bundle size &gt;500KB (gzipped)
- Time to Interactive &gt;3 seconds
- Janky scrolling or animations
- Memory leaks from unmounted components

â **NOT for**:
- Apps with &lt;10 components (premature optimization)
- Backend API slowness (fix the API)
- Network latency (use caching/CDN)
- Non-React frameworks (use framework-specific tools)

## Quick Decision Tree

```
Is your React app slow?
âââ Profiler shows &gt;16ms renders? â Use memoization
âââ Lists with &gt;100 items? â Use virtualization
âââ Bundle size &gt;500KB? â Code splitting
âââ Lighthouse score &lt;70? â Multiple optimizations
âââ Feels fast enough? â Don't optimize yet
```

---

## Technology Selection

### Performance Tools (2024)

| Tool | Purpose | When to Use |
|------|---------|-------------|
| React DevTools Profiler | Find slow components | Always start here |
| Lighthouse | Overall performance score | Before/after comparison |
| webpack-bundle-analyzer | Identify large dependencies | Bundle &gt;500KB |
| why-did-you-render | Unnecessary re-renders | Debug re-render storms |
| React Compiler (2024+) | Automatic memoization | React 19+ |

**Timeline**:
- 2018: React.memo, useMemo, useCallback introduced
- 2020: Concurrent Mode (now Concurrent Rendering)
- 2022: Automatic batching in React 18
- 2024: React Compiler (automatic optimization)
- 2025+: React Compiler expected to replace manual memoization

---

## Common Anti-Patterns

### Anti-Pattern 1: Premature Memoization

**Novice thinking**: "Wrap everything in useMemo for speed"

**Problem**: Adds complexity and overhead for negligible gains.

**Wrong approach**:
```typescript
// â Over-optimization
function UserCard({ user }) {
  const fullName = useMemo(() => `${user.first} ${user.last}`, [user]);
  const age = useMemo(() => new Date().getFullYear() - user.birthYear, [user]);

  return <div>{fullName}, {age}</div>;
}
```

**Why wrong**: String concatenation is faster than useMemo overhead.

**Correct approach**:
```typescript
// â Simple is fast
function UserCard({ user }) {
  const fullName = `${user.first} ${user.last}`;
  const age = new Date().getFullYear() - user.birthYear;

  return <div>{fullName}, {age}</div>;
}
```

**Rule of thumb**: Only memoize if:
1. Computation takes &gt;5ms (use Profiler to measure)
2. Result used in dependency array
3. Prevents child re-renders

---

### Anti-Pattern 2: Not Memoizing Callbacks

**Problem**: New function instance on every render breaks React.memo.

**Wrong approach**:
```typescript
// â Child re-renders on every parent render
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <Child onUpdate={() => setCount(count + 1)} />
  );
}

const Child = React.memo(({ onUpdate }) => {
  return <button onClick={onUpdate}>Update</button>;
});
```

**Why wrong**: Arrow function creates new reference â React.memo useless.

**Correct approach**:
```typescript
// â Stable callback reference
function Parent() {
  const [count, setCount] = useState(0);

  const handleUpdate = useCallback(() => {
    setCount(c => c + 1);  // Updater function avoids dependency
  }, []);

  return <Child onUpdate={handleUpdate} />;
}

const Child = React.memo(({ onUpdate }) => {
  return <button onClick={onUpdate}>Update</button>;
});
```

---

### Anti-Pattern 3: Rendering Large Lists Without Virtualization

**Problem**: Rendering 1000+ DOM nodes causes lag.

**Symptom**: Scrolling feels janky, initial render slow.

**Wrong approach**:
```typescript
// â Renders all 10,000 items
function UserList({ users }) {
  return (
    <div>
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

**Correct approach**:
```typescript
// â Only renders visible items
import { FixedSizeList } from 'react-window';

function UserList({ users }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={users.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <UserCard user={users[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

**Impact**: 10,000 items: 5 seconds â 50ms render time.

---

### Anti-Pattern 4: No Code Splitting

**Problem**: 2MB bundle downloaded upfront, slow initial load.

**Wrong approach**:
```typescript
// â Everything in main bundle
import AdminPanel from './AdminPanel';  // 500KB
import Dashboard from './Dashboard';
import Settings from './Settings';

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
```

**Correct approach**:
```typescript
// â Lazy load routes
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./AdminPanel'));
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**Impact**: Initial bundle: 2MB â 300KB.

---

### Anti-Pattern 5: Expensive Operations in Render

**Problem**: Heavy computation on every render.

**Wrong approach**:
```typescript
// â Sorts on every render (even when data unchanged)
function ProductList({ products }) {
  const sorted = products.sort((a, b) => b.price - a.price);

  return <div>{sorted.map(p => <Product product={p} />)}</div>;
}
```

**Correct approach**:
```typescript
// â Memoize expensive operation
function ProductList({ products }) {
  const sorted = useMemo(
    () => [...products].sort((a, b) => b.price - a.price),
    [products]
  );

  return <div>{sorted.map(p => <Product product={p} />)}</div>;
}
```

---

## Implementation Patterns

### Pattern 1: React.memo for Pure Components

```typescript
// Prevent re-render when props unchanged
const ExpensiveComponent = React.memo(({ data }) => {
  // Complex rendering logic
  return <div>{/* ... */}</div>;
});

// With custom comparison
const UserCard = React.memo(
  ({ user }) => <div>{user.name}</div>,
  (prevProps, nextProps) => {
    // Return true if props equal (skip re-render)
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### Pattern 2: useMemo for Expensive Calculations

```typescript
function DataTable({ rows, columns }) {
  const sortedAndFiltered = useMemo(() => {
    console.log('Recomputing...');  // Only logs when rows/columns change

    return rows
      .filter(row => row.visible)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rows, columns]);

  return <Table data={sortedAndFiltered} />;
}
```

### Pattern 3: useCallback for Stable References

```typescript
function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('');

  // Stable reference, doesn't break child memoization
  const handleSubmit = useCallback(() => {
    onSearch(query);
  }, [query, onSearch]);

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={e => setQuery(e.target.value)} />
    </form>
  );
}
```

### Pattern 4: Virtualization (react-window)

```typescript
import { VariableSizeList } from 'react-window';

function MessageList({ messages }) {
  const getItemSize = (index) => {
    // Dynamic heights based on content
    return messages[index].text.length > 100 ? 80 : 50;
  };

  return (
    <VariableSizeList
      height={600}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Message message={messages[index]} />
        </div>
      )}
    </VariableSizeList>
  );
}
```

### Pattern 5: Code Splitting with React.lazy

```typescript
// Route-based splitting
const routes = [
  { path: '/home', component: lazy(() => import('./Home')) },
  { path: '/about', component: lazy(() => import('./About')) },
  { path: '/contact', component: lazy(() => import('./Contact')) }
];

// Component-based splitting
const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>

      {showChart && (
        <Suspense fallback={<Spinner />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
```

---

## Production Checklist

```
â¡ Profiler analysis completed (identified slow components)
â¡ Large lists use virtualization (&gt;100 items)
â¡ Routes code-split with React.lazy
â¡ Heavy components lazy-loaded
â¡ Callbacks memoized with useCallback
â¡ Expensive computations use useMemo
â¡ Pure components wrapped in React.memo
â¡ Bundle analyzed (no duplicate dependencies)
â¡ Tree-shaking enabled (ESM imports)
â¡ Images optimized and lazy-loaded
â¡ Lighthouse score &gt;90
â¡ Time to Interactive &lt;3 seconds
```

---

## When to Use vs Avoid

| Scenario | Optimize? |
|----------|-----------|
| Rendering 1000+ list items | â Yes - virtualize |
| Sorting/filtering large arrays | â Yes - useMemo |
| Passing callbacks to memoized children | â Yes - useCallback |
| String concatenation | â No - fast enough |
| Simple arithmetic | â No - don't memoize |
| 10-item list | â No - premature optimization |

---

## References

- `/references/profiling-guide.md` - How to use React DevTools Profiler
- `/references/bundle-optimization.md` - Reduce bundle size strategies
- `/references/memory-leaks.md` - Detect and fix memory leaks

## Scripts

- `scripts/performance_audit.ts` - Automated performance checks
- `scripts/bundle_analyzer.sh` - Analyze and visualize bundle

---

**This skill guides**: React performance optimization | Memoization | Virtualization | Code splitting | Bundle optimization | Profiling


