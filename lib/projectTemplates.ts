import type { TaskPriority } from "@/lib/types";

export type ProjectTemplateMilestone = { title: string; dueInDays: number };
export type ProjectTemplateTask = { title: string; priority: TaskPriority };

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  milestones: ProjectTemplateMilestone[];
  tasks: ProjectTemplateTask[];
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "website",
    name: "Website Project",
    description: "Discovery through launch for a client website build.",
    milestones: [
      { title: "Discovery & planning", dueInDays: 3 },
      { title: "Design mockups approved", dueInDays: 10 },
      { title: "Development complete", dueInDays: 25 },
      { title: "QA & launch", dueInDays: 35 },
    ],
    tasks: [
      { title: "Kickoff call", priority: "high" },
      { title: "Gather brand assets", priority: "medium" },
      { title: "Wireframes", priority: "medium" },
      { title: "Content draft", priority: "medium" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing Campaign",
    description: "Plan, launch, and measure a marketing campaign.",
    milestones: [
      { title: "Strategy & goals set", dueInDays: 3 },
      { title: "Creative assets ready", dueInDays: 10 },
      { title: "Campaign launch", dueInDays: 14 },
      { title: "Performance review", dueInDays: 30 },
    ],
    tasks: [
      { title: "Define target audience", priority: "high" },
      { title: "Draft campaign brief", priority: "medium" },
      { title: "Set up tracking & analytics", priority: "medium" },
    ],
  },
  {
    id: "onboarding",
    name: "Client Onboarding",
    description: "Get a new client set up and to their first deliverable.",
    milestones: [
      { title: "Kickoff call scheduled", dueInDays: 2 },
      { title: "Contracts signed", dueInDays: 5 },
      { title: "Access & accounts set up", dueInDays: 7 },
      { title: "First deliverable sent", dueInDays: 14 },
    ],
    tasks: [
      { title: "Send welcome email", priority: "high" },
      { title: "Collect requirements", priority: "high" },
      { title: "Schedule kickoff call", priority: "medium" },
    ],
  },
];

export function getProjectTemplate(id: string): ProjectTemplate | null {
  return PROJECT_TEMPLATES.find((t) => t.id === id) ?? null;
}
