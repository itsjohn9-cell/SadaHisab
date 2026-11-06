import { db } from '../db/db';

export interface GDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Loads the Google Identity Services script dynamically if not present
 */
export async function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return;

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google GIS script')));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google GIS script'));
    document.head.appendChild(script);
  });
}

/**
 * Requests an OAuth2 access token for Google Drive (drive.file scope)
 */
export async function requestGDriveToken(clientId: string): Promise<string> {
  await loadGsiScript();

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
          } else if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('No access token received from Google Auth.'));
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Finds or creates the "SadaCash_Backups" folder in Google Drive
 */
async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent("name = 'SadaCash_Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'SadaCash_Backups',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const folder = await createRes.json();
  return folder.id;
}

/**
 * Uploads a local JSON or encrypted database backup directly to Google Drive
 */
export async function uploadBackupToGDrive(
  accessToken: string,
  backupContent: string,
  fileName?: string
): Promise<{ success: boolean; fileId?: string; fileName?: string; error?: string }> {
  try {
    const folderId = await getOrCreateBackupFolder(accessToken);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const targetName = fileName || `sada_hisab_backup_${dateStr}.json`;

    const metadata = {
      name: targetName,
      parents: [folderId],
      mimeType: 'application/json',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      backupContent +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive API error: ${err}`);
    }

    const file = await res.json();
    return { success: true, fileId: file.id, fileName: targetName };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload backup to Google Drive' };
  }
}

/**
 * Lists backups in the "SadaCash_Backups" folder
 */
export async function listGDriveBackups(accessToken: string): Promise<GDriveBackupFile[]> {
  try {
    const folderId = await getOrCreateBackupFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, createdTime, size)&orderBy=createdTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch {
    return [];
  }
}

/**
 * Downloads a backup file's content from Google Drive by fileId
 */
export async function downloadGDriveBackup(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error('Failed to download backup from Google Drive.');
  }

  return await res.text();
}
