import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, TextField, MenuItem,
  Button, Alert, LinearProgress, Divider, Stack, Chip, alpha,
  useTheme, InputAdornment, IconButton, Skeleton, FormGroup,
  FormControlLabel, Checkbox, FormLabel, List, ListItem,
  ListItemIcon, ListItemText, CircularProgress,
} from '@mui/material';
import {
  BugReport, Send, ArrowBack, OpenInNew,
  Memory, LocationOn, Assignment, InfoOutlined, Router,
  PhotoCamera, Assessment,
  AttachFile, CloudUpload, InsertDriveFile, Close, CheckCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCreateIssue, useUpdateIssue, useIssueDetail } from '../../hooks/useIssues';
import { useJiraIssueTypes, useJiraPriorities, useJiraFieldOptions } from '../../hooks/useJiraMeta';
import { uploadAttachment } from '../../api/issues';

const AFFECTED_METER_FIELDS = [
  { key: 'affectedBlockLoad',   label: 'Block Load' },
  { key: 'affectedDailyLoad',   label: 'Daily Load' },
  { key: 'affectedBillingInfo', label: 'Billing Information' },
  { key: 'affectedEventLogs',   label: 'Event Logs' },
  { key: 'affectedNamePlate',   label: 'Name Plate Details' },
];

const NEARBY_METER_FIELDS = [
  { key: 'nearbyBlockLoad',   label: 'Block Load' },
  { key: 'nearbyDailyLoad',   label: 'Daily Load' },
  { key: 'nearbyBillingInfo', label: 'Billing Information' },
  { key: 'nearbyEventLogs',   label: 'Event Logs' },
  { key: 'nearbyNamePlate',   label: 'Name Plate Details' },
];

const schema = z.object({
  workType:            z.string().min(1, 'Select a work type'),
  summary:             z.string().min(3, 'Summary is required'),
  issueDescription:    z.string().min(1, 'Issue description is required'),
  meterSerial:         z.string().min(1, 'Meter serial number is required'),
  meterType:           z.string().min(1, 'Meter type is required'),
  communicationType:   z.string().min(1, 'Communication type is required'),
  issueClassification: z.string().min(1, 'Classification is required'),
  siteLocation:        z.string().min(1, 'Site location is required'),
  firmwareVersion:     z.string().min(1, 'Firmware version is required'),
  priority:            z.string().min(1, 'Priority is required'),
  connectedDcuId:      z.string().optional(),
  nearbyDcuId:         z.string().optional(),
  photosAttached:      z.boolean().optional(),
  videosAttached:      z.boolean().optional(),
  hesScreenshots:      z.boolean().optional(),
  affectedBlockLoad:   z.boolean().optional(),
  affectedDailyLoad:   z.boolean().optional(),
  affectedBillingInfo: z.boolean().optional(),
  affectedEventLogs:   z.boolean().optional(),
  affectedNamePlate:   z.boolean().optional(),
  nearbyBlockLoad:     z.boolean().optional(),
  nearbyDailyLoad:     z.boolean().optional(),
  nearbyBillingInfo:   z.boolean().optional(),
  nearbyEventLogs:     z.boolean().optional(),
  nearbyNamePlate:     z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface PendingFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#ef5350', High: '#ff7043', Medium: '#ffa726', Low: '#66bb6a', Lowest: '#42a5f5',
};

const fmt = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; color?: string }> = ({ icon, title, color = 'primary.main' }) => {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
      <Box sx={{
        width: 30, height: 30, borderRadius: 1.5, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(theme.palette.primary.main, 0.1), color, flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ color }}>{title}</Typography>
    </Stack>
  );
};

const JiraSelect: React.FC<{
  label: string; options: string[]; loading?: boolean; required?: boolean;
  value: string; onChange: (v: string) => void; error?: boolean; helperText?: string;
}> = ({ label, options, loading, required, value, onChange, error, helperText }) => (
  <TextField fullWidth select required={required} label={label} value={value}
    onChange={(e) => onChange(e.target.value)} error={error} helperText={helperText}
    disabled={loading} InputLabelProps={{ shrink: true }}
    InputProps={loading ? { endAdornment: <InputAdornment position="end"><Skeleton width={20} height={20} variant="circular" /></InputAdornment> } : undefined}
    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
  >
    {loading ? <MenuItem value="">Loading from Jira…</MenuItem>
      : options.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
  </TextField>
);

const CheckboxGroup: React.FC<{
  title: string; icon: React.ReactNode; color: string;
  fields: { key: string; label: string }[];
  control: any;
}> = ({ title, icon, color, fields, control }) => (
  <Box>
    <Stack direction="row" alignItems="center" spacing={0.75} mb={1}>
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <FormLabel sx={{ color, fontWeight: 600, fontSize: 13 }}>{title}</FormLabel>
    </Stack>
    <FormGroup row>
      {fields.map(({ key, label }) => (
        <Controller key={key} name={key as any} control={control} render={({ field }) => (
          <FormControlLabel
            control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} size="small" sx={{ color }} />}
            label={<Typography variant="caption">{label}</Typography>}
            sx={{ mr: 2, mb: 0.5 }}
          />
        )} />
      ))}
    </FormGroup>
  </Box>
);

const IssueFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue(id ?? '');
  const { data: existingIssue } = useIssueDetail(isEdit ? (id ?? '') : '');

  const { data: issueTypes, isLoading: loadingTypes } = useJiraIssueTypes();
  const { data: priorities, isLoading: loadingPriorities } = useJiraPriorities();
  const [selectedIssueTypeId, setSelectedIssueTypeId] = useState('11333');
  const { data: fieldOptions, isLoading: loadingFields } = useJiraFieldOptions(selectedIssueTypeId);
  const loadingMeta = loadingTypes || loadingPriorities || loadingFields;

  const meterTypeOptions = fieldOptions?.customfield_11661?.allowedValues ?? [];
  const commTypeOptions  = fieldOptions?.customfield_11662?.allowedValues ?? [];
  const classOptions     = fieldOptions?.customfield_11663?.allowedValues ?? [];
  const priorityOptions  = (priorities ?? []).map((p: any) => p.name);
  const workTypeOptions  = (issueTypes ?? []).map((t: any) => t.name);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { workType: 'Field Issue', priority: 'Medium' },
  });

  const selectedWorkType = watch('workType');
  useEffect(() => {
    const found = (issueTypes as any[])?.find((t: any) => t.name === selectedWorkType);
    if (found) setSelectedIssueTypeId(found.id);
  }, [selectedWorkType, issueTypes]);

  useEffect(() => {
    if (existingIssue) {
      reset({
        summary:             (existingIssue as any).summary ?? existingIssue.title ?? '',
        workType:            (existingIssue as any).jiraIssueType ?? 'Field Issue',
        priority:            (existingIssue as any).priorityDisplay ?? 'Medium',
        meterSerial:         (existingIssue as any).meterSerial ?? existingIssue.meterSerialNumber ?? '',
        meterType:           (existingIssue as any).meterTypeDisplay ?? '',
        communicationType:   (existingIssue as any).commTypeDisplay ?? '',
        issueClassification: (existingIssue as any).categoryDisplay ?? '',
        siteLocation:        (existingIssue as any).customerSiteAddress ?? existingIssue.siteLocation ?? '',
        firmwareVersion:     (existingIssue as any).meterFirmwareVersion ?? existingIssue.firmwareVersion ?? '',
        issueDescription:    (existingIssue as any).fieldObservations ?? existingIssue.description ?? '',
      });
    }
  }, [existingIssue, reset]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newEntries: PendingFile[] = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}`,
      status: 'pending',
    }));
    setPendingFiles((prev) => [...prev, ...newEntries]);
  }, []);

  const removeFile = (fileId: string) =>
    setPendingFiles((prev) => prev.filter((f) => f.id !== fileId));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const selectedPriority = watch('priority');
  const isSubmitting = createIssue.isPending || updateIssue.isPending;

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      const checkboxFields: Record<string, any> = {};
      if (data.photosAttached)      checkboxFields['customfield_11665'] = [{ value: 'Yes' }];
      if (data.videosAttached)      checkboxFields['customfield_11666'] = [{ value: 'Yes' }];
      if (data.hesScreenshots)      checkboxFields['customfield_11667'] = [{ value: 'Yes' }];
      if (data.affectedBlockLoad)   checkboxFields['customfield_11668'] = [{ value: 'Yes' }];
      if (data.affectedDailyLoad)   checkboxFields['customfield_11669'] = [{ value: 'Yes' }];
      if (data.affectedBillingInfo) checkboxFields['customfield_11670'] = [{ value: 'Yes' }];
      if (data.affectedEventLogs)   checkboxFields['customfield_11671'] = [{ value: 'Yes' }];
      if (data.affectedNamePlate)   checkboxFields['customfield_11672'] = [{ value: 'Yes' }];
      if (data.nearbyBlockLoad)     checkboxFields['customfield_11673'] = [{ value: 'Yes' }];
      if (data.nearbyDailyLoad)     checkboxFields['customfield_11674'] = [{ value: 'Yes' }];
      if (data.nearbyBillingInfo)   checkboxFields['customfield_11675'] = [{ value: 'Yes' }];
      if (data.nearbyEventLogs)     checkboxFields['customfield_11676'] = [{ value: 'Yes' }];
      if (data.nearbyNamePlate)     checkboxFields['customfield_11677'] = [{ value: 'Yes' }];

      const payload: any = {
        summary:             data.summary,
        description:         data.issueDescription,
        workType:            data.workType,
        meterSerial:         data.meterSerial,
        meterType:           data.meterType,
        commType:            data.communicationType,
        category:            data.issueClassification,
        customerSiteAddress: data.siteLocation,
        firmwareVersion:     data.firmwareVersion,
        fieldObservations:   data.issueDescription,
        priority:            data.priority,
        connectedDcuId:      data.connectedDcuId,
        nearbyDcuId:         data.nearbyDcuId,
        extraFields:         checkboxFields,
      };

      let createdId: string;
      if (isEdit) {
        await updateIssue.mutateAsync(payload);
        createdId = id!;
      } else {
        const created = await createIssue.mutateAsync(payload);
        createdId = created.id;
      }

      // Upload any queued files to the newly created issue
      if (pendingFiles.length > 0 && createdId) {
        for (let i = 0; i < pendingFiles.length; i++) {
          const entry = pendingFiles[i];
          setUploadProgress(`Uploading file ${i + 1} of ${pendingFiles.length}: ${entry.file.name}`);
          setPendingFiles((prev) =>
            prev.map((f) => f.id === entry.id ? { ...f, status: 'uploading' } : f)
          );
          try {
            await uploadAttachment(createdId, entry.file);
            setPendingFiles((prev) =>
              prev.map((f) => f.id === entry.id ? { ...f, status: 'done' } : f)
            );
          } catch {
            setPendingFiles((prev) =>
              prev.map((f) => f.id === entry.id ? { ...f, status: 'error' } : f)
            );
          }
        }
        setUploadProgress(null);
      }

      navigate('/issues');
    } catch (err: any) {
      setUploadProgress(null);
      setSubmitError(err?.response?.data?.detail ?? err?.message ?? 'Failed to submit issue');
    }
  };

  const totalSubmitting = isSubmitting || !!uploadProgress;

  return (
    <Box sx={{ maxWidth: 1020, mx: 'auto', pb: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton size="small" onClick={() => navigate(-1)}
            sx={{ bgcolor: alpha(theme.palette.text.primary, 0.06), borderRadius: 1.5 }}>
            <ArrowBack fontSize="small" />
          </IconButton>
          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.3px">
              {isEdit ? 'Edit Issue' : 'Create Field Issue'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isEdit ? `Editing ${existingIssue?.issueNumber ?? id}` : 'Creates directly in Jira · FIT project'}
            </Typography>
          </Box>
        </Stack>
        <Chip icon={<OpenInNew sx={{ fontSize: '13px !important' }} />}
          label="grampower.atlassian.net · FIT" size="small"
          sx={{ bgcolor: alpha('#0052CC', 0.08), color: '#0052CC', fontWeight: 700, fontSize: 11, border: `1px solid ${alpha('#0052CC', 0.2)}` }}
        />
      </Stack>

      {totalSubmitting && (
        <Box mb={2}>
          <LinearProgress sx={{ borderRadius: 1 }} />
          {uploadProgress && (
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
              {uploadProgress}
            </Typography>
          )}
        </Box>
      )}
      {submitError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      {loadingMeta && <Alert severity="info" icon={<InfoOutlined fontSize="small" />} sx={{ mb: 2, borderRadius: 2 }}>Loading field options from Jira…</Alert>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2.5}>

          {/* ── LEFT ── */}
          <Grid item xs={12} lg={8}>

            {/* Issue Details */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<BugReport fontSize="small" />} title="Issue Details" />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Controller name="workType" control={control} render={({ field }) => (
                      <JiraSelect label="Work Type *" options={workTypeOptions} loading={loadingTypes}
                        required value={field.value ?? ''} onChange={field.onChange}
                        error={!!errors.workType} helperText={errors.workType?.message} />
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <Controller name="summary" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} required label="Summary *"
                        placeholder="Brief title of the issue"
                        error={!!errors.summary} helperText={errors.summary?.message}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )} />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller name="issueDescription" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} required multiline rows={4}
                        label="Issue Description *"
                        placeholder="Describe the issue in detail — observations, symptoms, context…"
                        error={!!errors.issueDescription} helperText={errors.issueDescription?.message}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Meter Details */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<Memory fontSize="small" />} title="Meter Details" color="#7b1fa2" />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller name="meterSerial" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} required label="Meter Serial Number *"
                        placeholder="e.g. PG-3PH-00999"
                        error={!!errors.meterSerial} helperText={errors.meterSerial?.message}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Typography variant="caption" color="text.secondary" fontFamily="monospace">#</Typography></InputAdornment> }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="meterType" control={control} render={({ field }) => (
                      <JiraSelect label="Meter Type *" options={meterTypeOptions} loading={loadingFields}
                        required value={field.value ?? ''} onChange={field.onChange}
                        error={!!errors.meterType} helperText={errors.meterType?.message} />
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="firmwareVersion" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} required label="Firmware Version *"
                        placeholder="e.g. v2.1.4"
                        error={!!errors.firmwareVersion} helperText={errors.firmwareVersion?.message}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="communicationType" control={control} render={({ field }) => (
                      <JiraSelect label="Communication Type *" options={commTypeOptions} loading={loadingFields}
                        required value={field.value ?? ''} onChange={field.onChange}
                        error={!!errors.communicationType} helperText={errors.communicationType?.message} />
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="connectedDcuId" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} label="Connected DCU ID"
                        placeholder="DCU serial / ID"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller name="nearbyDcuId" control={control} render={({ field }) => (
                      <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} label="Nearby Meter - Connected DCU ID"
                        placeholder="Nearby DCU serial / ID"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Site Location */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<LocationOn fontSize="small" />} title="Site Location" color="#00897b" />
                <Controller name="siteLocation" control={control} render={({ field }) => (
                  <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} required label="Site Location *"
                    placeholder="Full site address / location description"
                    error={!!errors.siteLocation} helperText={errors.siteLocation?.message}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                )} />
              </CardContent>
            </Card>

            {/* Evidence Upload */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<AttachFile fontSize="small" />} title="Evidence" color="#0277bd" />

                {/* Drop zone */}
                <Box
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: `2px dashed ${isDragOver ? '#0052CC' : theme.palette.divider}`,
                    borderRadius: 2.5,
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDragOver ? alpha('#0052CC', 0.04) : alpha(theme.palette.text.primary, 0.02),
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#0052CC', bgcolor: alpha('#0052CC', 0.04) },
                  }}
                >
                  <CloudUpload sx={{ fontSize: 36, color: isDragOver ? '#0052CC' : 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" fontWeight={600} color={isDragOver ? '#0052CC' : 'text.secondary'}>
                    Drag & drop files here
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    or click to browse · photos, videos, screenshots, logs
                  </Typography>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                  />
                </Box>

                {/* File list */}
                {pendingFiles.length > 0 && (
                  <List dense sx={{ mt: 1.5 }}>
                    {pendingFiles.map((entry) => (
                      <ListItem
                        key={entry.id}
                        sx={{
                          borderRadius: 2, mb: 0.5, px: 1.5,
                          bgcolor: entry.status === 'error'
                            ? alpha('#f44336', 0.06)
                            : entry.status === 'done'
                              ? alpha('#4caf50', 0.06)
                              : alpha(theme.palette.text.primary, 0.03),
                          border: `1px solid ${
                            entry.status === 'error' ? alpha('#f44336', 0.2)
                              : entry.status === 'done' ? alpha('#4caf50', 0.2)
                                : theme.palette.divider
                          }`,
                        }}
                        secondaryAction={
                          entry.status === 'uploading' ? (
                            <CircularProgress size={16} />
                          ) : entry.status === 'done' ? (
                            <CheckCircle sx={{ fontSize: 18, color: '#4caf50' }} />
                          ) : (
                            <IconButton size="small" edge="end" onClick={() => removeFile(entry.id)}>
                              <Close fontSize="small" />
                            </IconButton>
                          )
                        }
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <InsertDriveFile sx={{ fontSize: 18, color: '#0052CC' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 280 }}>{entry.file.name}</Typography>}
                          secondary={
                            <Typography variant="caption" color={entry.status === 'error' ? 'error' : 'text.secondary'}>
                              {entry.status === 'error' ? 'Upload failed' : entry.status === 'done' ? 'Uploaded to Jira' : fmt(entry.file.size)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {pendingFiles.length > 0 && (
                  <Typography variant="caption" color="text.disabled" mt={1} display="block">
                    {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} queued — will upload to Jira after issue is created
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Attachments available checkboxes */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, mb: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<PhotoCamera fontSize="small" />} title="Attachments Available" color="#d84315" />
                <FormGroup row>
                  {[
                    { key: 'photosAttached', label: 'Photos Attached' },
                    { key: 'videosAttached', label: 'Videos Attached' },
                    { key: 'hesScreenshots', label: 'HES Screenshots' },
                  ].map(({ key, label }) => (
                    <Controller key={key} name={key as any} control={control} render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} size="small" color="primary" />}
                        label={<Typography variant="body2">{label}</Typography>}
                        sx={{ mr: 3 }}
                      />
                    )} />
                  ))}
                </FormGroup>
              </CardContent>
            </Card>

            {/* Meter Data Collected */}
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<Assessment fontSize="small" />} title="Meter Data Collected" color="#1565c0" />
                <Stack spacing={2.5}>
                  <CheckboxGroup title="Affected Meter" icon={<Router fontSize="small" />} color="#7b1fa2" fields={AFFECTED_METER_FIELDS} control={control} />
                  <Divider />
                  <CheckboxGroup title="Nearby Meter" icon={<Router fontSize="small" />} color="#00897b" fields={NEARBY_METER_FIELDS} control={control} />
                </Stack>
              </CardContent>
            </Card>

          </Grid>

          {/* ── RIGHT ── */}
          <Grid item xs={12} lg={4}>
            <Card elevation={0} sx={{
              border: `1px solid ${theme.palette.divider}`, borderRadius: 3,
              position: { lg: 'sticky' }, top: { lg: 80 },
            }}>
              <CardContent sx={{ p: 3 }}>
                <SectionHeader icon={<Assignment fontSize="small" />} title="Classification" color="#e65100" />
                <Stack spacing={2}>
                  <Controller name="priority" control={control} render={({ field }) => (
                    <TextField {...field} fullWidth InputLabelProps={{ shrink: true }} select required label="Priority *"
                      disabled={loadingPriorities} error={!!errors.priority}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                      {loadingPriorities ? <MenuItem value="">Loading…</MenuItem>
                        : priorityOptions.map((p: string) => (
                          <MenuItem key={p} value={p}>
                            <Stack direction="row" alignItems="center" spacing={1.25}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PRIORITY_COLORS[p] ?? '#9e9e9e', flexShrink: 0 }} />
                              <span>{p}</span>
                            </Stack>
                          </MenuItem>
                        ))}
                    </TextField>
                  )} />
                  <Controller name="issueClassification" control={control} render={({ field }) => (
                    <JiraSelect label="Issue Classification *" options={classOptions} loading={loadingFields}
                      required value={field.value ?? ''} onChange={field.onChange}
                      error={!!errors.issueClassification} helperText={errors.issueClassification?.message} />
                  )} />
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={700}
                  textTransform="uppercase" letterSpacing={0.8} display="block" mb={1}>Preview</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {selectedPriority && (
                    <Chip label={selectedPriority} size="small" sx={{
                      bgcolor: alpha(PRIORITY_COLORS[selectedPriority] ?? '#9e9e9e', 0.12),
                      color: PRIORITY_COLORS[selectedPriority] ?? 'text.primary',
                      fontWeight: 700, fontSize: 11,
                    }} />
                  )}
                  {pendingFiles.length > 0 && (
                    <Chip
                      icon={<AttachFile sx={{ fontSize: '12px !important' }} />}
                      label={`${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}`}
                      size="small"
                      sx={{ bgcolor: alpha('#0052CC', 0.08), color: '#0052CC', fontWeight: 700, fontSize: 11 }}
                    />
                  )}
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Stack direction="row" alignItems="center" spacing={1.25}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%', bgcolor: alpha('#1976d2', 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#1976d2', fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>
                    {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" lineHeight={1}>Reporter</Typography>
                    <Typography variant="body2" fontWeight={700} lineHeight={1.4}>{user?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.5}>
                  <Button type="submit" variant="contained" fullWidth size="large" startIcon={<Send />}
                    disabled={totalSubmitting || loadingMeta}
                    sx={{
                      borderRadius: 2.5, fontWeight: 700, py: 1.25,
                      background: 'linear-gradient(135deg, #0052CC, #0065FF)',
                      boxShadow: '0 4px 14px rgba(0,82,204,0.4)',
                      '&:hover': { boxShadow: '0 6px 20px rgba(0,82,204,0.5)' },
                    }}
                  >
                    {uploadProgress ? 'Uploading files…' : isSubmitting ? 'Creating in Jira…' : isEdit ? 'Save Changes' : `Create in Jira${pendingFiles.length ? ` + ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}` : ''}`}
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<ArrowBack />}
                    onClick={() => navigate(-1)} disabled={totalSubmitting}
                    sx={{ borderRadius: 2.5, fontWeight: 600 }}>
                    Cancel
                  </Button>
                </Stack>

                <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: alpha('#0052CC', 0.05), border: `1px solid ${alpha('#0052CC', 0.15)}` }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <OpenInNew sx={{ fontSize: 13, color: '#0052CC', mt: 0.15, flexShrink: 0 }} />
                    <Typography variant="caption" color="#0052CC" lineHeight={1.5}>
                      Issue and attachments are created directly in Jira project <strong>FIT</strong>.
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>

        </Grid>
      </form>
    </Box>
  );
};

export default IssueFormPage;
