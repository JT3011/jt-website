// Keep the original File throughout upload. No resizing, re-encoding or compression.
export const MAX_MEDIA_BYTES = 262144000;

export function mediaFileType(file) {
  if (/^(video|image)\//.test(file.type)) return file.type;
  if (file.type && file.type !== 'application/octet-stream') return '';
  const types = {mov:'video/quicktime',mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',
    jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif',webp:'image/webp'};
  return types[file.name.split('.').pop().toLowerCase()] || '';
}

export function validateOriginalMedia(file) {
  if (!file.size) throw new Error(`${file.name} is empty. Choose the original file again.`);
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error(`${file.name} is over the 250 MB limit. Choose a shorter original clip; the Hub will not reduce its quality.`);
  }
  if (!mediaFileType(file)) throw new Error(`${file.name} is not a supported video or photo.`);
}

export function mediaSizeLabel(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  return size < 1048576 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1048576).toFixed(1)} MB`;
}

// The job survives an interrupted save, so retrying does not re-upload linked files.
export async function uploadOriginalMedia(supabase, job, session, coachId) {
  const { file } = job;
  validateOriginalMedia(file);
  if (job.linked) return;
  const type = mediaFileType(file);
  job.path ||= `${session.player_user_id}/${session.session_id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  if (!job.uploaded) {
    const { error } = await supabase.storage.from('session-media').upload(job.path, file, {
      upsert: false,
      contentType: type
    });
    if (error) throw new Error(`Could not upload ${file.name}. ${error.message || 'Please try again.'}`);
    job.uploaded = true;
  }
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
