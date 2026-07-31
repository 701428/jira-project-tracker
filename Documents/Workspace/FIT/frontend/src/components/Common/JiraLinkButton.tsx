import React from 'react';
import { Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const JIRA_LOGO_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iamlyYS1ncmFkIiB4MT0iMTAwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzI2ODRGRiIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMDA1MkNDIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHBhdGggZD0iTTcuOTg1IDFMNC4xMSA0Ljg3NWE1LjM1IDUuMzUgMCAwIDAgMCA3LjU2TDcuOTg1IDE2bDMuODc1LTMuNTY1YTUuMzUgNS4zNSAwIDAgMCAwLTcuNTZMNy45ODUgMXptMCAxMC4zNzVhMi42NzUgMi42NzUgMCAxIDEgMC01LjM1IDIuNjc1IDIuNjc1IDAgMCAxIDAgNS4zNXoiIGZpbGw9InVybCgjamlyYS1ncmFkKSIvPgo8L3N2Zz4K';

interface JiraLinkButtonProps {
  jiraUrl?: string | null;
  jiraKey?: string | null;
}

const JiraLinkButton: React.FC<JiraLinkButtonProps> = ({ jiraUrl, jiraKey }) => {
  if (!jiraUrl) return null;

  return (
    <Button
      variant="outlined"
      size="small"
      href={jiraUrl}
      target="_blank"
      rel="noopener noreferrer"
      startIcon={
        <img
          src={JIRA_LOGO_DATA_URI}
          alt="Jira"
          width={16}
          height={16}
          style={{ display: 'block' }}
        />
      }
      endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important' }} />}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        borderColor: '#0052CC',
        color: '#0052CC',
        '&:hover': {
          borderColor: '#0052CC',
          bgcolor: 'rgba(0,82,204,0.06)',
        },
      }}
    >
      {jiraKey ? `View ${jiraKey} in Jira` : 'View in Jira'}
    </Button>
  );
};

export default JiraLinkButton;
