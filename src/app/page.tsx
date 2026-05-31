import { Dashboard } from "@/components/tasks/dashboard";
import { listTasks } from "@/lib/actions/tasks";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tasks = await listTasks();

  return (
    <div className="container py-6 sm:py-10">
      <Dashboard initialTasks={tasks} />
    </div>
  );
}
