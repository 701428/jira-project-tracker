import React, { useCallback } from 'react';
import { useDropzone, Accept } from 'react-dropzone';
import {
  Box,
  Typography,
  IconButton,
  Grid,
  Paper,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';

export interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  uploadProgress?: number;
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ACCEPTED_TYPES: Accept = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
  'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  'text/plain': ['.txt', '.log'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/pdf': ['.pdf'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(file: File): React.ReactNode {
  if (file.type.startsWith('image/')) return <ImageIcon sx={{ color: 'primary.main' }} />;
  if (file.type.startsWith('video/')) return <VideocamIcon sx={{ color: 'secondary.main' }} />;
  return <InsertDriveFileIcon sx={{ color: 'text.secondary' }} />;
}

const FileCard: React.FC<{
  uploadedFile: UploadedFile;
  onRemove: (id: string) => void;
  disabled?: boolean;
}> = ({ uploadedFile, onRemove, disabled }) => {
  const { file, id, preview, uploadProgress } = uploadedFile;
  const isImage = file.type.startsWith('image/');

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        overflow: 'hidden',
        '&:hover .remove-btn': { opacity: 1 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {isImage && preview ? (
          <Box
            component="img"
            src={preview}
            alt={file.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ fontSize: 36 }}>{getFileIcon(file)}</Box>
        )}
      </Box>
      <Tooltip title={file.name}>
        <Typography
          variant="caption"
          noWrap
          sx={{ fontWeight: 600, maxWidth: '100%', display: 'block' }}
        >
          {file.name}
        </Typography>
      </Tooltip>
      <Typography variant="caption" color="text.secondary">
        {formatBytes(file.size)}
      </Typography>
      {uploadProgress !== undefined && uploadProgress < 100 && (
        <LinearProgress
          variant="determinate"
          value={uploadProgress}
          sx={{ mt: 0.5, borderRadius: 1 }}
        />
      )}
      {!disabled && (
        <IconButton
          className="remove-btn"
          size="small"
          onClick={() => onRemove(id)}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            opacity: 0,
            transition: 'opacity 0.2s',
            bgcolor: 'background.paper',
            boxShadow: 1,
            p: 0.25,
            '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Paper>
  );
};

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  files,
  onChange,
  maxFiles = 10,
  disabled = false,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = maxFiles - files.length;
      const toAdd = acceptedFiles.slice(0, remaining).map((f) => ({
        file: f,
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      }));
      onChange([...files, ...toAdd]);
    },
    [files, onChange, maxFiles]
  );

  const handleRemove = (id: string) => {
    const removed = files.find((f) => f.id === id);
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    onChange(files.filter((f) => f.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: maxFiles - files.length,
    disabled: disabled || files.length >= maxFiles,
    multiple: true,
  });

  const isAtMax = files.length >= maxFiles;

  return (
    <Box>
      {!isAtMax && (
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragReject ? 'error.main' : isDragActive ? 'primary.main' : 'divider',
            borderRadius: 2,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            bgcolor: isDragActive ? 'action.selected' : 'action.hover',
            transition: 'border-color 0.2s, background-color 0.2s',
            '&:hover': {
              borderColor: disabled ? 'divider' : 'primary.main',
              bgcolor: disabled ? 'action.hover' : 'action.selected',
            },
            opacity: disabled ? 0.5 : 1,
            mb: files.length > 0 ? 2 : 0,
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 40, color: isDragActive ? 'primary.main' : 'text.disabled' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center' }}>
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            or click to browse — images, videos, .log .txt .xlsx .pdf .zip
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {files.length} / {maxFiles} files uploaded
          </Typography>
          {isDragReject && (
            <Typography variant="caption" color="error.main">
              Some files are not accepted
            </Typography>
          )}
        </Box>
      )}
      {files.length > 0 && (
        <Grid container spacing={1.5}>
          {files.map((f) => (
            <Grid item key={f.id} xs={6} sm={4} md={3} lg={2}>
              <FileCard uploadedFile={f} onRemove={handleRemove} disabled={disabled} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default FileUploadZone;
