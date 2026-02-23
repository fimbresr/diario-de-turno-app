export type Role = 'admin' | 'tech';

export type Screen =
  | 'login'
  | 'tech_dashboard'
  | 'register_job'
  | 'finish_task'
  | 'tech_history'
  | 'tech_profile'
  | 'admin_dashboard'
  | 'admin_team'
  | 'admin_settings';

export interface Technician {
  id: string;
  name: string;
  role: Role;
  shift: string;
  password: string;
}

export interface JobDraft {
  area: string;
  workType: string;
  description: string;
  additionalComments: string;
  beforePhoto: string | null;
  afterPhoto: string | null;
}

export interface Job {
  id: string;
  area: string;
  workType: string;
  description: string;
  additionalComments: string;
  technicianName: string;
  shift: string;
  createdAt: string;
  finishedAt: string;
  signature: string;
  beforePhoto: string | null;
  afterPhoto: string | null;
  deleted?: boolean;
}
