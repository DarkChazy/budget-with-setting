import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { AccountPage } from "@/components/AccountPage";

export const Route = createFileRoute("/private")({
  component: () => (
    <AppLayout>
      <AccountPage accountType="private" title="Private Account" />
    </AppLayout>
  ),
});
