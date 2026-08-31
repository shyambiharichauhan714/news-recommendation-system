// NOTE: This route-group layout is intentionally unused — see components/layout/AppShell.tsx
// for the actual shell implementation, applied conditionally in app/layout.tsx based on route.
// Kept as a no-op pass-through in case route groups are adopted later.
export default function UnusedAppGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
