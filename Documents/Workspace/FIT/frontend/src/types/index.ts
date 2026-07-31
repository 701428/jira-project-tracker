// ─── Enums ───────────────────────────────────────────────────────────────────

export enum IssueStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATED = 'VALIDATED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum IssuePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IssueSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export enum IssueCategory {
  HARDWARE = 'HARDWARE',
  SOFTWARE = 'SOFTWARE',
  FIRMWARE = 'FIRMWARE',
  COMMUNICATION = 'COMMUNICATION',
  POWER = 'POWER',
  CALIBRATION = 'CALIBRATION',
  INSTALLATION = 'INSTALLATION',
  OTHER = 'OTHER',
}

export enum MeterType {
  SINGLE_PHASE = 'SINGLE_PHASE',
  THREE_PHASE = 'THREE_PHASE',
  LTCT = 'LTCT',
  HTCT = 'HTCT',
  PREPAID = 'PREPAID',
  SMART = 'SMART',
}

export enum CommType {
  RS485 = 'RS485',
  GSM = 'GSM',
  NB_IOT = 'NB_IOT',
  LORAWAN = 'LORAWAN',
  ETHERNET = 'ETHERNET',
  OPTICAL = 'OPTICAL',
  PLC = 'PLC',
  WIFI = 'WIFI',
}

export enum UserRole {
  FIELD_ENGINEER = 'FIELD_ENGINEER',
  APPROVER = 'APPROVER',
  DEVELOPER = 'DEVELOPER',
  REVIEWER = 'REVIEWER',
  VALIDATOR = 'VALIDATOR',
  ADMIN = 'ADMIN',
}

export enum ApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ValidationResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  PARTIAL = 'PARTIAL',
}

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  employeeId?: string;
  department?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAttachment {
  id: string;
  issueId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: IUser;
  createdAt: string;
}

export interface IComment {
  id: string;
  issueId: string;
  body: string;
  author: IUser;
  createdAt: string;
  updatedAt: string;
}

export interface IActivityLog {
  id: string;
  issueId: string;
  action: string;
  fromStatus?: IssueStatus;
  toStatus?: IssueStatus;
  performedBy: IUser;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface IApproval {
  id: string;
  issueId: string;
  decision: ApprovalDecision;
  comments: string;
  approvedBy: IUser;
  createdAt: string;
}

export interface IDeveloperNote {
  id: string;
  issueId: string;
  rootCause?: string;
  actionTaken?: string;
  partsReplaced?: string;
  softwareVersion?: string;
  resolutionNotes?: string;
  developer: IUser;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface IValidation {
  id: string;
  issueId: string;
  result: ValidationResult;
  remarks: string;
  validatedBy: IUser;
  validatedAt: string;
}

// ─── Issue Interfaces ─────────────────────────────────────────────────────────

export interface IFieldIssue {
  id: string;
  issueNumber: string;
  // summary from Jira maps to both title and summary
  title?: string;
  summary?: string;
  description?: string;
  status: IssueStatus;
  statusDisplay?: string;
  priority: IssuePriority;
  priorityDisplay?: string;
  severity: IssueSeverity;
  severityDisplay?: string;
  category: IssueCategory;
  categoryDisplay?: string;

  // Meter info — raw enum integers + display strings
  meterType?: MeterType | number;
  meterTypeDisplay?: string;
  meterSerial?: string;
  meterSerialNumber?: string;   // legacy alias
  meterFirmwareVersion?: string;
  firmwareVersion?: string;     // legacy alias
  hardwareRevision?: string;
  commType?: CommType | number;
  commTypeDisplay?: string;

  // Site / location
  siteId?: string;
  siteName?: string;
  siteLocation?: string;
  customerSiteAddress?: string;
  customerName?: string;

  // Issue description fields
  fieldObservations?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;

  // People
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  reportedBy?: IUser;
  assignedTo?: IUser;
  assignedDeveloperId?: string;
  assignedDeveloperName?: string;
  assigneeName?: string;  // legacy

  // Jira integration
  jiraKey?: string;
  jiraUrl?: string;

  // Sub-documents
  approval?: IApproval;
  developerNote?: IDeveloperNote;
  validation?: IValidation;
  attachments: IAttachment[];
  comments: IComment[];
  activityLogs: IActivityLog[];

  // Timestamps
  reportedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IIssueList {
  id: string;
  issueNumber: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  category: IssueCategory;
  siteId?: string;
  siteName?: string;
  meterSerialNumber?: string;
  reportedBy: Pick<IUser, 'id' | 'name' | 'avatarUrl'>;
  assignedTo?: Pick<IUser, 'id' | 'name' | 'avatarUrl'>;
  commentsCount: number;
  attachmentsCount: number;
  reportedAt: string;
  updatedAt: string;
}

export interface ICreateIssue {
  title: string;
  description: string;
  workType?: string;
  priority: IssuePriority;
  severity: IssueSeverity;
  category: IssueCategory;
  siteId?: string;
  siteName?: string;
  siteLocation?: string;
  meterSerialNumber?: string;
  meterType?: MeterType;
  commType?: CommType;
  firmwareVersion?: string;
  hardwareRevision?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface IDashboardStatusCount {
  status: IssueStatus;
  count: number;
}

export interface IDashboardPriorityCount {
  priority: IssuePriority;
  count: number;
}

export interface IDashboardCategoryCount {
  category: IssueCategory;
  count: number;
}

export interface IDashboard {
  totalIssues: number;
  openIssues: number;
  resolvedToday: number;
  avgResolutionHours: number;
  byStatus: IDashboardStatusCount[];
  byPriority: IDashboardPriorityCount[];
  byCategory: IDashboardCategoryCount[];
  recentIssues: IIssueList[];
  myPendingIssues: IIssueList[];
  overdueIssues: IIssueList[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface IAuthResponse {
  token: string;
  user: IUser;
  expiresIn: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface IPagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
