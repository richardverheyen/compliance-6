export interface ProcessControl {
  id: string;
  group: string;
  label: string;
  "detail-required": boolean;
  "correct-option": string;
  "detail-label"?: string;
  "process-id"?: string;
  "source-rules"?: string[];
  "mapping-confidence"?: number;
  "checklist-items"?: Array<{
    label?: string;
    type?: string;
    items?: Array<{ label: string }>;
  }>;
}

export interface ProcessGroup {
  id: string;
  title: string;
  description?: string;
  variant?: "main" | "subprocess";
}

export interface SubType {
  id: string;
  label: string;
}

export interface FormLink {
  target: string;
  label: string;
  gated_by?: string;
}

export interface ControlNote {
  comment: string;
  severity: "approved" | "info" | "warning" | "error";
}

export interface ReviewMetadata {
  form_id: string;
  last_updated?: string;
  notes?: string[];
  control_notes?: Record<string, ControlNote>;
}

export interface ProcessForm {
  controls: ProcessControl[];
  groups: ProcessGroup[];
  rules: Array<{
    target: string;
    scope: string;
    effect: string;
    schema: { const: string };
  }>;
  sub_scoping?: SubType[];
  form_links?: FormLink[];
  _review_metadata?: ReviewMetadata;
}

export interface FeedbackData {
  form_id: string;
  notes?: string[];
  control_notes?: Record<string, ControlNote>;
  last_updated?: string;
}
