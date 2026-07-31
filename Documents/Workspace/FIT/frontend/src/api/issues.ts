import { apiClient } from './client';
export { apiClient };
import type {
  IFieldIssue,
  IIssueList,
  ICreateIssue,
  IComment,
  IAttachment,
  IDashboard,
  IUser,
  ValidationResult,
  UserRole,
} from '../types';

export interface IssueListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  severity?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DeveloperNoteData {
  rootCause?: string;
  actionTaken?: string;
  partsReplaced?: string;
  softwareVersion?: string;
  resolutionNotes?: string;
}

export const getIssues = async (
  params?: IssueListParams & { statuses?: string[] }
): Promise<{ issues: IIssueList[]; total: number }> => {
  // Backend accepts a single `status` — use first selected status if coming from multi-select UI
  const { statuses, ...rest } = (params ?? {}) as any;
  const apiParams = {
    ...rest,
    ...(statuses?.length ? { status: statuses[0] } : {}),
  };
  const { data } = await apiClient.get<any>('/issues', { params: apiParams });
  // Backend returns { items, totalCount } — remap to what the DataGrid expects
  const items: IIssueList[] = (data.items ?? data.issues ?? []).map((item: any) => {
    const assigneeName = item.assignedDeveloperName ?? item.assigneeName;
    return {
      ...item,
      status: item.statusDisplay ?? item.status,
      priority: item.priorityDisplay ?? item.priority,
      severity: item.severityDisplay ?? item.severity,
      reporterName: item.reporterName ?? item.reportedBy?.name,
      assignee: assigneeName ? { name: assigneeName } : null,
    };
  });
  return { issues: items, total: data.totalCount ?? data.total ?? items.length };
};

export const getIssue = async (id: string): Promise<IFieldIssue> => {
  const { data } = await apiClient.get<IFieldIssue>(`/issues/${id}`);
  return data;
};

// Jira exact values (from createmeta API) are included alongside legacy enum names
const METER_TYPE_MAP: Record<string, number> = {
  '1P': 0, 'SinglePhase': 0, 'Single phase Garud': 0, 'Single Phase': 0,
  '3P': 1, 'ThreePhase': 1, 'Three phase': 1, 'Three Phase': 1,
  'LTCT': 2, 'LTCT Meter': 2,
  'HTCT': 3,
  'Prepaid': 4,
  'Smart': 5,
};
const COMM_TYPE_MAP: Record<string, number> = {
  'None': 0,
  'RF': 1,
  'GPRS': 2, '4G': 2, 'LTE': 2, 'NB_IoT': 2,
  'IMG': 3,
  'PLC': 4, 'RS485': 5, 'Ethernet': 6,
};
const PRIORITY_MAP: Record<string, number> = {
  'Lowest': 0, 'Low': 0,
  'Medium': 1,
  'High': 2,
  'Highest': 3, 'Critical': 3,
};
const SEVERITY_MAP: Record<string, number> = { 'Minor': 0, 'Moderate': 1, 'Major': 2, 'Critical': 3, 'S4': 0, 'S3': 1, 'S2': 2, 'S1': 3 };
const CATEGORY_MAP: Record<string, number> = {
  'Firmware': 0, 'Firmware (FW)': 0,
  'Hardware': 1, 'Hardware (HW)': 1,
  'Communication': 2,
  'Software (SW)': 3, 'Software': 3,
  'Mechanical (Mech)': 4, 'Mechanical': 4,
  'Metering': 5, 'Display': 6, 'Calibration': 7, 'DataIntegrity': 8, 'Other': 9,
};

const toInt = (map: Record<string, number>, val: any) =>
  typeof val === 'number' ? val : (map[String(val)] ?? map[String(val).split(' ')[0]] ?? 0);

const mapFormToCommand = (payload: any) => ({
  summary:              payload.summary,
  description:          payload.issueDescription ?? payload.description,
  workType:             payload.workType ?? 'Field Issue',
  meterSerial:          payload.meterSerial,
  meterFirmwareVersion: payload.firmwareVersion ?? payload.meterFirmwareVersion,
  customerId:           payload.customerId || undefined,
  customerSiteAddress:  payload.siteLocation ?? payload.siteName ?? payload.customerSiteAddress,
  fieldObservations:    payload.issueDescription ?? payload.description,
  stepsToReproduce:     payload.stepsToReproduce,
  expectedBehavior:     payload.expectedBehaviour ?? payload.expectedBehavior,
  actualBehavior:       payload.actualBehaviour ?? payload.actualBehavior,
  connectedDcuId:       payload.connectedDcuId || undefined,
  nearbyDcuId:          payload.nearbyDcuId || undefined,
  extraFields:          payload.extraFields || undefined,
  // Accept exact Jira values OR legacy enum values
  meterType:  toInt(METER_TYPE_MAP, payload.meterType),
  commType:   toInt(COMM_TYPE_MAP, payload.communicationType ?? payload.commType ?? 'None'),
  priority:   toInt(PRIORITY_MAP, payload.priority),
  severity:   toInt(SEVERITY_MAP, payload.severity ?? 'Minor'),
  category:   toInt(CATEGORY_MAP, payload.issueClassification ?? payload.category),
});

export const createIssue = async (payload: ICreateIssue): Promise<IFieldIssue> => {
  const { data } = await apiClient.post<IFieldIssue>('/issues', mapFormToCommand(payload));
  return data;
};

export const updateIssue = async (
  id: string,
  payload: Partial<ICreateIssue>
): Promise<IFieldIssue> => {
  const { data } = await apiClient.put<IFieldIssue>(`/issues/${id}`, mapFormToCommand(payload));
  return data;
};

export const submitIssue = async (id: string): Promise<void> => {
  await apiClient.post(`/issues/${id}/submit`);
};

export const approveIssue = async (id: string, comments: string): Promise<void> => {
  await apiClient.post(`/issues/${id}/approve`, { comments });
};

export const rejectIssue = async (id: string, comments: string): Promise<void> => {
  await apiClient.post(`/issues/${id}/reject`, { comments });
};

export const assignDeveloper = async (
  id: string,
  developerId: string
): Promise<void> => {
  await apiClient.post(`/issues/${id}/assign`, { developerId });
};

export const updateDeveloperNote = async (
  id: string,
  data: DeveloperNoteData
): Promise<void> => {
  await apiClient.put(`/issues/${id}/developer-note`, data);
};

export const moveToReview = async (id: string): Promise<void> => {
  await apiClient.post(`/issues/${id}/move-to-review`);
};

export const approveReview = async (id: string, comments: string): Promise<void> => {
  await apiClient.post(`/issues/${id}/approve-review`, { comments });
};

export const rejectReview = async (id: string, comments: string): Promise<void> => {
  await apiClient.post(`/issues/${id}/reject-review`, { comments });
};

export const submitValidation = async (
  id: string,
  result: ValidationResult,
  remarks: string
): Promise<void> => {
  await apiClient.post(`/issues/${id}/validate`, { result, remarks });
};

export const addComment = async (
  id: string,
  body: string
): Promise<IComment> => {
  const { data } = await apiClient.post<IComment>(`/issues/${id}/comments`, { content: body });
  return data;
};

export const uploadAttachment = async (
  id: string,
  file: File
): Promise<IAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<IAttachment>(
    `/issues/${id}/attachments`,
    formData,
    { headers: { 'Content-Type': undefined } }  // unset JSON default so axios sets multipart+boundary
  );
  return data;
};

export const getDashboard = async (): Promise<IDashboard> => {
  const { data } = await apiClient.get<IDashboard>('/dashboard');
  return data;
};

export const getUsers = async (role?: UserRole): Promise<IUser[]> => {
  const { data } = await apiClient.get<IUser[]>('/users', {
    params: role ? { role } : undefined,
  });
  return data;
};
