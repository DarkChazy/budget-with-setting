import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AccountPage } from "@/components/AccountPage";

export const Route = createFileRoute("/house")({
  component: () => (
    <AppLayout>
      <AccountPage accountType="house" title="House Account" />
    </AppLayout>
  ),
});
