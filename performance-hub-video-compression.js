// Loaded only for oversized videos. Original files never leave the device to be compressed.
let codecModule;
const loadCodecs = () => codecModule ||= import('https://cdn.jsdelivr.net/npm/mediabunny@1.65.2/dist/bundles/mediabunny.min.mjs')
  .catch(error => { codecModule = null; throw error; });

export function compressionSettings(duration, width, height, maxBytes, attempt = 0) {
  if (![duration, width, height, maxBytes].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Unable to read the video length or dimensions.');
  }
  // Leave headroom for container overhead and encoder variation; bound phone memory use.
  const budget = Math.min(maxBytes * 0.75, 96 * 1048576) * 0.55 ** attempt;
  const totalBitrate = Math.floor(budget * 8 / duration);
  const audioBitrate = Math.min(128000, Math.max(24000, Math.floor(totalBitrate * 0.12)));
  const videoBitrate = Math.min(8000000, totalBitrate - audioBitrate);
  if (videoBitrate < 32000) throw new Error('This video is too long to fit in one upload. Your selected file has been kept.');
  const longest = videoBitrate >= 3500000 ? 1920 : videoBitrate >= 1500000 ? 1280 : videoBitrate >= 600000 ? 854 : 640;
  const scale = Math.min(1, longest / Math.max(width, height));
  return {
    width: Math.max(2, Math.floor(width * scale / 2) * 2),
    height: Math.max(2, Math.floor(height * scale / 2) * 2),
    videoBitrate, audioBitrate
  };
}

export async function compressVideo(file, maxBytes, onProgress = () => {}) {
  onProgress({stage: 'compressing', progress: 0});
  const m = await loadCodecs();
  const input = new m.Input({formats: m.ALL_FORMATS, source: new m.BlobSource(file)});
  try {
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    if (!video || !await video.canDecode() || (audio && !await audio.canDecode())) {
      throw new Error('This browser cannot reduce this video format. Your selected file has been kept; try the latest Safari or Chrome.');
    }
    const duration = await input.computeDuration();
    const width = await video.getDisplayWidth(), height = await video.getDisplayHeight();
    for (let attempt = 0; attempt < 3; attempt++) {
      const settings = compressionSettings(duration, width, height, maxBytes, attempt);
      const quality = new m.Quality({bitrate: settings.videoBitrate});
      const mp4 = await m.canEncodeVideo('avc', {...settings, quality}) && (!audio || await m.canEncodeAudio('aac'));
      const output = new m.Output({
        format: mp4 ? new m.Mp4OutputFormat({fastStart: 'in-memory'}) : new m.WebMOutputFormat(),
        target: new m.BufferTarget()
      });
      const conversion = await m.Conversion.init({
        input, output, tracks: 'primary', tags: {}, showWarnings: false,
        video: {codec: mp4 ? 'avc' : 'vp8', width: settings.width, height: settings.height,
          fit: 'contain', allowTransformationMetadata: false, frameRate: 30, quality},
        audio: {codec: mp4 ? 'aac' : 'opus', quality: new m.Quality({bitrate: settings.audioBitrate})}
      });
      // Never upload an audio-only or accidentally silent conversion.
      if (!conversion.isValid || conversion.discardedTracks.some(item => item.track === video || item.track === audio)) {
        await conversion.cancel();
        throw new Error('This browser cannot reduce this video with its sound intact. Your selected file has been kept.');
      }
      let exceeded = false;
      output.target.on('write', ({end}) => {
        if (end > maxBytes && !exceeded) { exceeded = true; void conversion.cancel(); }
      });
      conversion.onProgress = progress => onProgress({stage: 'compressing', progress, attempt});
      try {
        await conversion.execute();
      } catch (error) {
        await conversion.cancel().catch(() => {});
        if (exceeded) continue;
        throw error;
      }
      const buffer = output.target.buffer;
      if (buffer?.byteLength && buffer.byteLength <= maxBytes && buffer.byteLength < file.size) {
        return new File([buffer], `${file.name.replace(/\.[^.]+$/, '')}-optimised.${mp4 ? 'mp4' : 'webm'}`, {
          type: mp4 ? 'video/mp4' : 'video/webm', lastModified: file.lastModified
        });
      }
    }
    throw new Error('Unable to make this video small enough. Your selected file has been kept.');
  } finally {
    input.dispose();
  }
}
