import { AgentForm } from '@/components/dashboard/AgentForm';

export default function NewAgentPage() {
  return (
    <div>
      <div className="px-8 py-8 border-b border-border">
        <h1 className="text-2xl font-semibold text-primary">New AI agent</h1>
      </div>
      <div className="px-8 py-6">
        <AgentForm />
      </div>
    </div>
  );
}
