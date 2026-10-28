import { getOrRequestDriveAccessToken } from '../firebase/config';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  iconLink?: string;
  webViewLink?: string;
  shared?: boolean;
  owners?: { displayName?: string; emailAddress?: string }[];
  driveId?: string;
  isFolder?: boolean;
  isSharedDrive?: boolean;
}

export interface ListDriveFilesOptions {
  searchQuery?: string;
  showAllFiles?: boolean;
  scope?: 'all' | 'shared_folders' | 'shared' | 'mydrive' | 'shared_drives';
  folderId?: string | null;
  driveId?: string | null;
  accessToken?: string;
}

/**
 * Extract Google Drive file or folder ID from raw ID or URL
 */
export function extractDriveId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  
  // Direct ID check (usually 25-50 alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  // Google Drive folder URL: drive.google.com/drive/folders/ID or drive.google.com/drive/u/0/folders/ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];

  // Google Drive file URL: drive.google.com/file/d/ID
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) return fileMatch[1];

  // Google Docs / Sheets URL: docs.google.com/document/d/ID
  const docMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) return docMatch[1];

  // URL query parameter id=ID
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch && queryMatch[1]) return queryMatch[1];

  return null;
}

/**
 * List Google Workspace Shared Drives (Team Drives) that the user has access to
 */
export async function listSharedDrives(accessToken?: string): Promise<DriveFileItem[]> {
  const token = accessToken || await getOrRequestDriveAccessToken();
  try {
    const url = new URL('https://www.googleapis.com/drive/v3/drives');
    url.searchParams.set('pageSize', '50');
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.warn('Could not list shared drives:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.drives || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      mimeType: 'application/vnd.google-apps.folder',
      modifiedTime: new Date().toISOString(),
      isFolder: true,
      isSharedDrive: true,
      driveId: d.id,
      shared: true
    }));
  } catch (err) {
    console.warn('Shared drives error:', err);
    return [];
  }
}

/**
 * List files and shared folders from Google Drive, with full support for:
 * - Shared folders ('sharedWithMe' or nested folders)
 * - Google Workspace Shared Drives
 * - Inside specific parent folders
 * - Search across all drives
 */
export async function listDriveFiles(options: ListDriveFilesOptions = {}): Promise<DriveFileItem[]> {
  const token = options.accessToken || await getOrRequestDriveAccessToken();

  // If scope is specifically 'shared_drives', fetch team drives directly
  if (options.scope === 'shared_drives' && !options.folderId) {
    return await listSharedDrives(token);
  }

  // 1. Browsing inside a specific folder or shared folder
  if (options.folderId) {
    let q = `'${options.folderId}' in parents and trashed = false`;
    if (!options.showAllFiles) {
      // Include subfolders and document files
      q += " and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'application/pdf' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.google-apps.spreadsheet' or name contains '.txt' or name contains '.md' or name contains '.doc' or name contains '.docx' or name contains 'SOW' or name contains 'Statement of Work')";
    }
    if (options.searchQuery?.trim()) {
      const sanitized = options.searchQuery.trim().replace(/'/g, "\\'");
      q += ` and name contains '${sanitized}'`;
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('orderBy', 'folder,modifiedTime desc');
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    if (options.driveId) {
      url.searchParams.set('corpora', 'drive');
      url.searchParams.set('driveId', options.driveId);
    }
    url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, size, iconLink, webViewLink, shared, owners(displayName, emailAddress), driveId)');
    url.searchParams.set('q', q);

    let res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Fallback without corpora if error
    if (!res.ok && options.driveId) {
      url.searchParams.delete('corpora');
      url.searchParams.delete('driveId');
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to read folder contents (${res.status})`);
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      ...f,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder'
    }));
  }

  // 2. Browsing "Shared Folders" scope (folders shared directly with the user)
  if (options.scope === 'shared_folders') {
    let q = "mimeType = 'application/vnd.google-apps.folder' and sharedWithMe = true and trashed = false";
    if (options.searchQuery?.trim()) {
      const sanitized = options.searchQuery.trim().replace(/'/g, "\\'");
      q += ` and name contains '${sanitized}'`;
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('pageSize', '60');
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, size, iconLink, webViewLink, shared, owners(displayName, emailAddress), driveId)');
    url.searchParams.set('q', q);

    const [foldersRes, sharedDrives] = await Promise.all([
      fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } }),
      listSharedDrives(token).catch(() => [])
    ]);

    let sharedFolders: DriveFileItem[] = [];
    if (foldersRes.ok) {
      const data = await foldersRes.json();
      sharedFolders = (data.files || []).map((f: any) => ({
        ...f,
        isFolder: true,
        shared: true
      }));
    }

    return [...sharedDrives, ...sharedFolders];
  }

  // 3. Browsing root level or searching
  let q = 'trashed = false';

  if (options.scope === 'shared') {
    q += " and (sharedWithMe = true or not 'me' in owners)";
  } else if (options.scope === 'mydrive') {
    q += " and 'me' in owners";
  }

  if (!options.showAllFiles && !options.searchQuery) {
    // Include shared folders and relevant SOW document types
    q += " and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'application/pdf' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.google-apps.spreadsheet' or name contains '.txt' or name contains '.md' or name contains '.doc' or name contains '.docx' or name contains 'SOW' or name contains 'Statement of Work')";
  }

  if (options.searchQuery?.trim()) {
    const sanitized = options.searchQuery.trim().replace(/'/g, "\\'");
    q += ` and name contains '${sanitized}'`;
    if (!options.showAllFiles) {
      q += " and (mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'application/pdf' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType = 'application/msword' or mimeType = 'application/vnd.google-apps.spreadsheet' or name contains '.txt' or name contains '.md' or name contains '.doc' or name contains '.docx' or name contains 'SOW')";
    }
  }

  // Query files
  const executeQuery = async (includeCorporaAllDrives: boolean) => {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('pageSize', '60');
    url.searchParams.set('orderBy', 'folder,modifiedTime desc');
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    if (includeCorporaAllDrives) {
      url.searchParams.set('corpora', 'allDrives');
    }
    url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, size, iconLink, webViewLink, shared, owners(displayName, emailAddress), driveId)');
    url.searchParams.set('q', q);

    return fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  let res = await executeQuery(true);
  if (!res.ok) {
    res = await executeQuery(false);
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch Google Drive files (${res.status})`);
  }

  const data = await res.json();
  const rawFiles = (data.files || []) as any[];

  // Also, if at root "all" scope and no search query, ensure shared folders and shared drives are included
  if (options.scope === 'all' && !options.searchQuery) {
    try {
      const [sharedDrivesList, sharedFoldersRes] = await Promise.all([
        listSharedDrives(token).catch(() => []),
        fetch(
          "https://www.googleapis.com/drive/v3/files?pageSize=20&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,mimeType,modifiedTime,size,iconLink,webViewLink,shared,owners,driveId)&q=mimeType='application/vnd.google-apps.folder' and sharedWithMe=true and trashed=false",
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(r => r.ok ? r.json() : { files: [] }).catch(() => ({ files: [] }))
      ]);

      const sharedFolders = (sharedFoldersRes.files || []).map((f: any) => ({
        ...f,
        isFolder: true,
        shared: true
      }));

      // Combine with deduplication by ID
      const existingIds = new Set<string>();
      const combined: DriveFileItem[] = [];

      for (const item of [...sharedDrivesList, ...sharedFolders]) {
        if (!existingIds.has(item.id)) {
          existingIds.add(item.id);
          combined.push(item);
        }
      }

      for (const f of rawFiles) {
        if (!existingIds.has(f.id)) {
          existingIds.add(f.id);
          combined.push({
            ...f,
            isFolder: f.mimeType === 'application/vnd.google-apps.folder'
          });
        }
      }

      return combined;
    } catch {
      // In case of error in secondary queries, return primary raw files
    }
  }

  return rawFiles.map(f => ({
    ...f,
    isFolder: f.mimeType === 'application/vnd.google-apps.folder'
  }));
}

/**
 * Resolve a Google Drive link, folder URL, or file ID directly
 */
export async function resolveDriveItem(
  urlOrId: string,
  accessToken?: string
): Promise<{ item: DriveFileItem; isFolder: boolean }> {
  const token = accessToken || await getOrRequestDriveAccessToken();
  const id = extractDriveId(urlOrId);
  if (!id) {
    throw new Error('Please enter a valid Google Drive URL, folder link, or document ID.');
  }

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${id}`);
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('fields', 'id, name, mimeType, modifiedTime, size, iconLink, webViewLink, shared, owners(displayName, emailAddress), driveId');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Could not find or access item (${res.status}). Verify sharing permissions.`);
  }

  const file = await res.json();
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

  return {
    item: {
      ...file,
      isFolder
    },
    isFolder
  };
}

/**
 * Fetch and extract text content from a Google Drive file.
 * Supports files stored in user Drive as well as all shared folders & shared drives.
 * Handles Google Docs (via export to text/plain), standard text/markdown files, and csv sheets.
 */
export async function fetchDriveFileContent(
  fileId: string,
  mimeType: string,
  accessToken?: string
): Promise<string> {
  const token = accessToken || await getOrRequestDriveAccessToken();

  let fetchUrl = '';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`
  };

  // 1. Google Docs: Export to plain text (with supportsAllDrives for shared drives)
  if (mimeType === 'application/vnd.google-apps.document') {
    fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&supportsAllDrives=true`;
  } 
  // 2. Google Spreadsheets: Export to CSV (with supportsAllDrives)
  else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv&supportsAllDrives=true`;
  } 
  // 3. Regular file: Download media content (with supportsAllDrives)
  else {
    fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
  }

  const response = await fetch(fetchUrl, { headers });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to download file content from Google Drive (${response.status})`);
  }

  const textContent = await response.text();
  return textContent;
}
