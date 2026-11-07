import { compressVideo } from './performance-hub-video-compression.js?v=20261107-auto';

// Preserve originals when they fit; automatically prepare smaller copies otherwise.
export const MAX_MEDIA_BYTES = 262144000;

export function mediaFileType(file) {
  if (/^(video|image)\//.test(file.type)) return file.type;
  if (file.type && file.type !== 'application/octet-stream') return '';
  const types = {mov:'video/quicktime',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',
    jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif',webp:'image/webp'};
  return types[file.name.split('.').pop().toLowerCase()] || '';
}

export function validateMediaFile(file) {
  if (!file.size) throw new Error(`${file.name} is empty. Choose the original file again.`);
  if (file.size > MAX_MEDIA_BYTES && !mediaFileType(file).startsWith('video/')) {
    throw new Error(`${file.name} is over the 250 MB photo limit.`);
  }
  if (!mediaFileType(file)) throw new Error(`${file.name} is not a supported video or photo.`);
}

export function mediaSizeLabel(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  return size < 1048576 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1048576).toFixed(1)} MB`;
}

export function mediaQualityLabel(media) {
  return media.storage_path?.includes('/jt-optimised-') ? 'Optimised for upload' : 'Original quality';
}

export function isMediaSizeError(error) {
  return Number(error?.statusCode || error?.status) === 413 ||
    /EntityTooLarge|PayloadTooLarge|exceeded.*(?:size|limit)|(?:size|payload|entity|file).*too large|maximum.*(?:size|limit)/i
      .test(`${error?.code || ''} ${error?.message || ''}`);
}

// Retain the original and prepared copy across an interrupted save. Linked files are skipped.
export async function uploadSessionMedia(supabase, job, session, coachId, {
  onProgress = () => {}, compress = compressVideo
} = {}) {
  validateMediaFile(job.file);
  if (job.linked) return;
  let file = job.preparedFile || job.file;
  let limit = job.maxBytes || MAX_MEDIA_BYTES;
  for (let attempt = 0; !job.uploaded; attempt++) {
    if (file.size > limit) {
      onProgress({stage: 'compressing', progress: 0});
      file = await compress(job.file, limit, onProgress);
      if (!file?.size || file.size > limit || !mediaFileType(file).startsWith('video/')) {
        throw new Error(`Could not prepare ${job.file.name} for upload. Your file has been kept.`);
      }
      job.preparedFile = file;
      job.path = null;
    }
    const type = mediaFileType(file);
    job.path ||= `${session.player_user_id}/${session.session_id}/${job.preparedFile ? 'jt-optimised-' : ''}${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    onProgress({stage: 'uploading', compressed: !!job.preparedFile});
    const { error } = await supabase.storage.from('session-media').upload(job.path, file, {
      upsert: false,
      contentType: type
    });
    if (error) {
      if (isMediaSizeError(error) && type.startsWith('video/') && attempt < 4) {
        // A project's global limit can be lower than the bucket's advertised limit.
        limit = Math.min(48 * 1048576, Math.floor(file.size * 0.5), Math.floor(limit * 0.5));
        job.maxBytes = limit;
        continue;
      }
      throw new Error(`Could not upload ${file.name}. ${error.message || 'Please try again.'}`);
    }
    job.uploaded = true;
  }
  const type = mediaFileType(file);
  onProgress({stage: 'attaching', compressed: !!job.preparedFile});
  const { error } = await supabase.from('session_connect_media').insert({
    session_id: session.session_id,
    player_user_id: session.player_user_id,
    coach_user_id: coachId,
    media_type: type.startsWith('video/') ? 'video' : 'image',
    storage_path: job.path,
    original_name: file.name,
    mime_type: type,
    file_size: file.size,
    visibility: 'player_parent'
  });
  if (error) {
    // A lost response can leave a successful insert behind. Check under the coach's RLS.
    const { data: existing } = await supabase.from('session_connect_media').select('id')
      .eq('storage_path', job.path).maybeSingle();
    if (!existing) throw new Error(`Could not attach ${file.name} to the session. Please retry saving.`);
  }
  job.linked = true;
}

export async function originalMediaDownload(supabase, mediaId) {
  // Authorise again for each download, including the player/parent visibility check.
  const { data: media, error } = await supabase.from('session_connect_media')
    .select('storage_path,original_name').eq('id', mediaId)
    .eq('visibility', 'player_parent').single();
  if (error || !media) throw new Error('This file is no longer available to your account.');
  const filename = (media.original_name || media.storage_path.split('/').pop() || 'JT-session-media')
    .replace(/[\x00-\x1f/\\]/g, '_');
  // Sign the stored object itself, never a preview or transformed version.
  const { data, error: signError } = await supabase.storage.from('session-media')
    .createSignedUrl(media.storage_path, 600, { download: filename });
  if (signError || !data?.signedUrl) throw new Error('Unable to prepare this download. Please try again.');
  return { url: data.signedUrl, filename };
}
