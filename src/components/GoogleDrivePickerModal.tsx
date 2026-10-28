import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  FileText, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Clock, 
  FolderKanban, 
  FileSpreadsheet, 
  FileCheck,
  ExternalLink,
  ChevronRight,
  Users,
  HardDrive,
  Folder,
  ArrowLeft,
  Link2,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { 
  listDriveFiles, 
  fetchDriveFileContent, 
  resolveDriveItem,
  DriveFileItem 
} from '../services/googleDriveService';
import { formatDate } from '../utils/helpers';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSelectFile: (fileContent: string, fileName: string, fileItem: DriveFileItem) => void;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  driveId?: string;
}

// Google Drive multi-color SVG icon
export const GoogleDriveIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onSelectFile
}) => {
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [driveScope, setDriveScope] = useState<'all' | 'shared_folders' | 'shared' | 'mydrive'>('all');
  const [showAllTypes, setShowAllTypes] = useState<boolean>(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isReadingContent, setIsReadingContent] = useState<boolean>(false);

  // Folder Navigation State
  const [currentFolder, setCurrentFolder] = useState<BreadcrumbItem | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  // Direct Link/URL input state
  const [showLinkInput, setShowLinkInput] = useState<boolean>(false);
  const [directLinkInput, setDirectLinkInput] = useState<string>('');
  const [isResolvingLink, setIsResolvingLink] = useState<boolean>(false);

  // Load files when modal opens or filter/folder changes
  const loadFiles = async (
    scope = driveScope, 
    allTypes = showAllTypes, 
    query = searchQuery,
    folder: BreadcrumbItem | null = currentFolder
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await listDriveFiles({
        scope: folder ? undefined : scope,
        folderId: folder ? folder.id : undefined,
        driveId: folder?.driveId,
        showAllFiles: allTypes,
        searchQuery: query
      });
      setFiles(items);
    } catch (err: any) {
      console.error('Failed to load Google Drive files:', err);
      setError(err?.message || 'Unable to access Google Drive. Please confirm permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFiles(driveScope, showAllTypes, searchQuery, currentFolder);
    }
  }, [isOpen, driveScope, showAllTypes, currentFolder]);

  // Navigate into a folder or shared drive
  const handleOpenFolder = (folderItem: DriveFileItem) => {
    const newCrumb: BreadcrumbItem = {
      id: folderItem.id,
      name: folderItem.name,
      driveId: folderItem.driveId || (folderItem.isSharedDrive ? folderItem.id : undefined)
    };
    setCurrentFolder(newCrumb);
    setBreadcrumbs(prev => [...prev, newCrumb]);
    setSearchQuery('');
  };

  // Navigate back to a specific breadcrumb level
  const handleJumpToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Jump to root
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } else {
      const target = breadcrumbs[index];
      setCurrentFolder(target);
      setBreadcrumbs(prev => prev.slice(0, index + 1));
    }
    setSearchQuery('');
  };

  // Navigate one level up
  const handleGoBack = () => {
    if (breadcrumbs.length <= 1) {
      setCurrentFolder(null);
      setBreadcrumbs([]);
    } else {
      const newCrumbs = breadcrumbs.slice(0, breadcrumbs.length - 1);
      const parent = newCrumbs[newCrumbs.length - 1];
      setCurrentFolder(parent);
      setBreadcrumbs(newCrumbs);
    }
  };

  // Handle direct link resolution (folder or file link)
  const handleResolveDirectLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directLinkInput.trim()) return;

    setIsResolvingLink(true);
    setError(null);

    try {
      const result = await resolveDriveItem(directLinkInput.trim());
      if (result.isFolder) {
        // Open folder
        handleOpenFolder(result.item);
        setDirectLinkInput('');
        setShowLinkInput(false);
      } else {
        // Import file
        await handleSelectFile(result.item);
        setDirectLinkInput('');
        setShowLinkInput(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not access the provided Google Drive link.');
    } finally {
      setIsResolvingLink(false);
    }
  };

  // Handle selecting and importing a file
  const handleSelectFile = async (file: DriveFileItem) => {
    try {
      setSelectedFileId(file.id);
      setIsReadingContent(true);
      setError(null);

      const content = await fetchDriveFileContent(file.id, file.mimeType);

      if (!content || !content.trim()) {
        throw new Error(`The file "${file.name}" is empty.`);
      }

      onSelectFile(content, file.name, file);
      onClose();
    } catch (err: any) {
      console.error('Error importing file from Google Drive:', err);
      setError(err?.message || 'Could not import the selected file.');
    } finally {
      setIsReadingContent(false);
      setSelectedFileId(null);
    }
  };

  const getFileBadge = (mimeType: string, name: string, isFolder?: boolean, isSharedDrive?: boolean) => {
    if (isSharedDrive) {
      return { label: 'Shared Team Drive', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
    }
    if (isFolder || mimeType === 'application/vnd.google-apps.folder') {
      return { label: 'Shared Folder', color: 'bg-amber-100 text-amber-900 border-amber-200' };
    }
    if (mimeType === 'application/vnd.google-apps.document') {
      return { label: 'Google Doc', color: 'bg-blue-100 text-blue-900 border-blue-200' };
    }
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return { label: 'Google Sheet', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
    }
    if (name.endsWith('.md')) {
      return { label: 'Markdown', color: 'bg-purple-100 text-purple-900 border-purple-200' };
    }
    if (name.endsWith('.txt')) {
      return { label: 'Text', color: 'bg-stone-100 text-stone-800 border-stone-200' };
    }
    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      return { label: 'Word Doc', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
    }
    return { label: 'Document', color: 'bg-stone-100 text-stone-700 border-stone-200' };
  };

  const isFileShared = (file: DriveFileItem) => {
    if (file.shared) return true;
    if (file.driveId) return true;
    if (file.owners && userEmail) {
      const isOwner = file.owners.some(o => o.emailAddress?.toLowerCase() === userEmail.toLowerCase());
      return !isOwner;
    }
    return false;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center border border-stone-700 shadow-2xs">
              <GoogleDriveIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif text-base font-medium tracking-tight">
                  Import from Google Drive & Shared Folders
                </h3>
                {userEmail && (
                  <span className="text-[10px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded-full border border-stone-700">
                    {userEmail}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Full access to all shared folders, Google Workspace team drives, and personal files
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumb Navigation Bar when inside a folder */}
        {currentFolder && (
          <div className="bg-stone-100 border-b border-stone-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-1.5 overflow-x-auto min-w-0">
              <button
                type="button"
                onClick={() => handleJumpToBreadcrumb(-1)}
                className="font-medium text-stone-600 hover:text-stone-900 flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>All Drive & Shared</span>
              </button>
              
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <button
                    type="button"
                    onClick={() => handleJumpToBreadcrumb(idx)}
                    className={`truncate cursor-pointer hover:underline ${
                      idx === breadcrumbs.length - 1
                        ? 'font-semibold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGoBack}
              className="text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Toolbar: Search, Location Filters & Link Option */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={currentFolder ? `Search inside "${currentFolder.name}"...` : "Search documents & shared folders by name across all drives..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    loadFiles(driveScope, showAllTypes, searchQuery, currentFolder);
                  }
                }}
                className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>

            <button
              type="button"
              onClick={() => loadFiles(driveScope, showAllTypes, searchQuery, currentFolder)}
              className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
              title="Search and refresh file list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Search</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer border ${
                showLinkInput 
                  ? 'bg-stone-900 text-white border-stone-900' 
                  : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
              title="Paste a direct Google Drive link or folder URL"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paste Link</span>
            </button>
          </div>

          {/* Collapsible Direct Link / Folder URL input bar */}
          {showLinkInput && (
            <form onSubmit={handleResolveDirectLink} className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-blue-900 font-medium">
                <span>Paste a Google Drive folder link or Google Doc URL:</span>
                <span className="text-blue-700 font-normal">e.g. drive.google.com/drive/folders/...</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/... or Google Doc link"
                  value={directLinkInput}
                  onChange={(e) => setDirectLinkInput(e.target.value)}
                  className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-1 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isResolvingLink || !directLinkInput.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  {isResolvingLink ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Opening...</span>
                    </>
                  ) : (
                    <span>Open / Load</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Drive Scope Tabs (visible when at root) */}
          {!currentFolder && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1 bg-stone-200/70 p-0.5 rounded-lg flex-wrap gap-y-1">
                <button
                  type="button"
                  onClick={() => setDriveScope('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    driveScope === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>All Accessible</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDriveScope('shared_folders')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                    driveScope === 'shared_folders'
                      ? 'bg-white text-amber-950 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
                  <span>Shared Folders & Team Drives</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDriveScope('shared')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    driveScope === 'shared'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Users className="w-3 h-3 text-stone-500" />
                  <span>Shared with Me</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDriveScope('mydrive')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center space-x-1 ${
                    driveScope === 'mydrive'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <HardDrive className="w-3 h-3 text-stone-500" />
                  <span>My Drive</span>
                </button>
              </div>

              <div className="flex items-center space-x-3 text-[11px] text-stone-500">
                <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAllTypes}
                    onChange={(e) => setShowAllTypes(e.target.checked)}
                    className="rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                  />
                  <span>All file types</span>
                </label>

                <span className="font-mono tabular-nums">
                  {files.length} item{files.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadFiles(driveScope, showAllTypes, searchQuery, currentFolder)}
              className="text-xs font-semibold underline hover:no-underline text-rose-800 cursor-pointer ml-3 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Items List Content (Files & Folders) */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100">
          {isLoading && files.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-7 h-7 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-stone-500 font-mono">
                {currentFolder 
                  ? `Loading files inside "${currentFolder.name}"...`
                  : 'Scanning personal drive, shared folders, and team shared drives...'}
              </p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-stone-200 rounded-xl my-2">
              <FolderOpen className="w-8 h-8 mx-auto opacity-40 text-stone-400" />
              <h4 className="text-xs font-semibold text-stone-800">
                {currentFolder ? 'This folder contains no matching files' : 'No matching files or shared folders found'}
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No files matching "${searchQuery}". Try a broader keyword.`
                  : driveScope === 'shared_folders'
                  ? "No shared folders detected on your account. You can paste a shared folder link above using 'Paste Link'."
                  : currentFolder
                  ? "Try checking 'All file types' above or upload a Statement of Work document."
                  : "No documents found. Check 'Shared Folders & Team Drives' or paste a shared folder link above."}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    loadFiles(driveScope, showAllTypes, '', currentFolder);
                  }}
                  className="mt-2 text-xs font-medium text-stone-800 underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            files.map((file) => {
              const isFolder = file.isFolder || file.mimeType === 'application/vnd.google-apps.folder';
              const badge = getFileBadge(file.mimeType, file.name, isFolder, file.isSharedDrive);
              const isCurrentReading = isReadingContent && selectedFileId === file.id;
              const shared = isFileShared(file);
              const owner = file.owners?.[0]?.displayName;

              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (isFolder) {
                      handleOpenFolder(file);
                    } else if (!isReadingContent) {
                      handleSelectFile(file);
                    }
                  }}
                  className={`group py-3 px-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isCurrentReading 
                      ? 'bg-blue-50 border border-blue-200' 
                      : isFolder
                      ? 'hover:bg-amber-50/60 border border-transparent hover:border-amber-200/70'
                      : 'hover:bg-stone-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isFolder
                        ? 'bg-amber-100/70 border-amber-200 text-amber-800 group-hover:bg-amber-200/80'
                        : file.mimeType === 'application/vnd.google-apps.document'
                        ? 'bg-blue-50 border-blue-200 text-blue-600'
                        : file.mimeType === 'application/vnd.google-apps.spreadsheet'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-stone-100 border-stone-200 text-stone-600'
                    }`}>
                      {isFolder ? (
                        <Folder className="w-4 h-4 fill-amber-500/20" />
                      ) : file.mimeType === 'application/vnd.google-apps.document' ? (
                        <FileText className="w-4 h-4 text-blue-600" />
                      ) : file.mimeType === 'application/vnd.google-apps.spreadsheet' ? (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-stone-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className={`text-xs font-medium group-hover:text-stone-950 truncate max-w-sm ${
                          isFolder ? 'text-amber-950 font-semibold' : 'text-stone-900'
                        }`}>
                          {file.name}
                        </span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${badge.color} shrink-0`}>
                          {badge.label}
                        </span>
                        {shared && !isFolder && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200 shrink-0 flex items-center space-x-1">
                            <Users className="w-2.5 h-2.5" />
                            <span>Shared</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-stone-500 font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>Modified {formatDate(file.modifiedTime.split('T')[0])}</span>
                        {owner && (
                          <>
                            <span>·</span>
                            <span>Owner: {owner}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isFolder ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFolder(file);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs group-hover:scale-[1.02]"
                      >
                        <span>Open Folder</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isReadingContent}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs ${
                          isCurrentReading
                            ? 'bg-blue-600 text-white'
                            : 'bg-stone-900 hover:bg-stone-800 text-white'
                        }`}
                      >
                        {isCurrentReading ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Importing...</span>
                          </>
                        ) : (
                          <>
                            <span>Select</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-500">
          <div className="flex items-center space-x-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Includes personal drive, all shared folders, and Google Workspace Shared Drives</span>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            {currentFolder && (
              <button
                type="button"
                onClick={() => handleJumpToBreadcrumb(-1)}
                className="text-xs font-medium text-stone-700 hover:text-stone-950 underline cursor-pointer"
              >
                Back to Root
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
