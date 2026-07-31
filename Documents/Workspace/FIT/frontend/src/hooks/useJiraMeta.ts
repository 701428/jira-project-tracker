import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface JiraIssueType {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraFieldMeta {
  name: string;
  required: boolean;
  allowedValues: string[];
}

export interface JiraFieldOptions {
  [fieldKey: string]: JiraFieldMeta;
}

export const useJiraIssueTypes = () =>
  useQuery<JiraIssueType[]>({
    queryKey: ['jira', 'issue-types'],
    queryFn: async () => { const r = await apiClient.get('/jira/issue-types'); return r.data; },
    staleTime: 10 * 60 * 1000,
  });

export const useJiraPriorities = () =>
  useQuery<JiraPriority[]>({
    queryKey: ['jira', 'priorities'],
    queryFn: async () => { const r = await apiClient.get('/jira/priorities'); return r.data; },
    staleTime: 10 * 60 * 1000,
  });

export const useJiraFieldOptions = (issueTypeId = '11333') =>
  useQuery<JiraFieldOptions>({
    queryKey: ['jira', 'field-options', issueTypeId],
    queryFn: async () => { const r = await apiClient.get(`/jira/field-options?issueTypeId=${issueTypeId}`); return r.data; },
    staleTime: 10 * 60 * 1000,
    enabled: !!issueTypeId,
  });
