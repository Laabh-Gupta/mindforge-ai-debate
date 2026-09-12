import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/result")({
  beforeLoad: () => {
    throw redirect({ to: "/evaluation" });
  },
});
