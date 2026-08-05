import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { ProjectsTabs } from "@/components/projects/ProjectsTabs";

export default function MilestonesTimelinePage() {
  return (
    <div className="flex flex-col gap-6">
      <ProjectsTabs />
      <PlaceholderPage
        title="Milestones & Timeline"
        description="A cross-project timeline view of every milestone, in one place."
        icon="folder"
      />
    </div>
  );
}
