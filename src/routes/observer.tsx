import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/observer')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/observer"!</div>
}
