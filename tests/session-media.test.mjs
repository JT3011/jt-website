import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_MEDIA_BYTES, mediaFileType, mediaSizeLabel, validateMediaFile, uploadSessionMedia, originalMediaDownload, isMediaSizeError, mediaQualityLabel } from '../performance-hub-session-media.js';

const session = { player_user_id: 'player', session_id: 'session' };
function uploadClient({failUpload = false, failMetadata = false, existing = null, errors = []} = {}) {
  const calls = { files: [], rows: [] };
  return {
    calls,
    storage: { from(bucket) {
      assert.equal(bucket, 'session-media');
      return { async upload(path, file, options) {
        calls.files.push({path, file, options});
        return {error: errors.shift() || (failUpload ? {message: 'Connection interrupted'} : null)};
      } };
    } },
    from(table) {
      assert.equal(table, 'session_connect_media');
      return {
        async insert(row) { calls.rows.push(row); return {error: failMetadata ? {message:'Could not save'} : null}; },
        select() { return {eq: () => ({maybeSingle: async () => ({data: existing})})}; }
      };
    }
  };
}

test('upload preserves the exact original bytes, file name, MIME type and size', async () => {
  const bytes = new Uint8Array([0, 1, 255, 18, 90, 0, 0, 41]);
  const file = new File([bytes], 'Original 4K.MOV', {type:'video/quicktime'});
  const client = uploadClient();
  const job = {file};
  await uploadSessionMedia(client, job, session, 'coach');
  assert.equal(client.calls.files[0].file, file);
  assert.deepEqual(new Uint8Array(await client.calls.files[0].file.arrayBuffer()), bytes);
  assert.deepEqual(client.calls.files[0].options, {upsert:false,contentType:'video/quicktime'});
  assert.equal(client.calls.rows[0].file_size, bytes.length);
  assert.equal(client.calls.rows[0].original_name, 'Original 4K.MOV');
  assert.equal(client.calls.rows[0].visibility, 'player_parent');
  await uploadSessionMedia(client, job, session, 'coach');
  assert.equal(client.calls.files.length, 1);
  assert.equal(client.calls.rows.length, 1);
});

test('oversized photos, empty and non-media files fail before anything is written', async () => {
  const client = uploadClient();
  for (const file of [
    {name:'large.jpg',type:'image/jpeg',size:MAX_MEDIA_BYTES+1},
    new File([], 'empty.mp4', {type:'video/mp4'}),
    new File(['not media'], 'file.html', {type:'text/html'})
  ]) await assert.rejects(uploadSessionMedia(client, {file}, session, 'coach'));
  assert.equal(client.calls.files.length, 0);
  assert.equal(client.calls.rows.length, 0);
  assert.doesNotThrow(() => validateMediaFile({name:'limit.mp4',type:'video/mp4',size:MAX_MEDIA_BYTES}));
});

test('phone files with missing MIME types retain their original format', () => {
  assert.equal(mediaFileType(new File(['original'], 'clip.MOV')), 'video/quicktime');
  assert.equal(mediaFileType(new File(['original'], 'photo.HEIC')), 'image/heic');
  assert.equal(mediaFileType({name:'clip.mp4',type:'text/html'}), '');
  assert.equal(mediaSizeLabel(10485760), '10.0 MB');
  assert.equal(mediaSizeLabel(null), '');
});

test('interrupted uploads cannot be reported as saved and can be retried', async () => {
  const file = new File(['video'], 'clip.mp4', {type:'video/mp4'});
  const job = {file};
  const failed = uploadClient({failUpload:true});
  await assert.rejects(uploadSessionMedia(failed, job, session, 'coach'), /Connection interrupted/);
  assert.equal(job.linked, undefined);
  assert.equal(failed.calls.rows.length, 0);
  const working = uploadClient();
  await uploadSessionMedia(working, job, session, 'coach');
  assert.equal(job.linked, true);
});

test('metadata retries reuse the uploaded original and reconcile a lost insert response', async () => {
  const job = {file:new File(['video'], 'clip.mp4', {type:'video/mp4'})};
  const failed = uploadClient({failMetadata:true});
  await assert.rejects(uploadSessionMedia(failed, job, session, 'coach'), /attach/);
  assert.equal(job.uploaded, true);
  const working = uploadClient({failMetadata:true,existing:{id:'saved-media'}});
  await uploadSessionMedia(working, job, session, 'coach');
  assert.equal(working.calls.files.length, 0);
  assert.equal(job.linked, true);
});

function downloadClient(media, {deny = false, failSign = false} = {}) {
  const calls = {filters: [], signed: []};
  const chain = {
    select() { return this; },
    eq(...args) { calls.filters.push(args); return this; },
    async single() {return {data:deny ? null : media,error:deny ? {message:'Forbidden'} : null};}
  };
  return {
    calls,
    from(table) { assert.equal(table,'session_connect_media'); return chain; },
    storage: { from(bucket) {
      assert.equal(bucket,'session-media');
      return {async createSignedUrl(...args) {
        calls.signed.push(args);
        return {data:failSign ? null : {signedUrl:'https://storage.example/original'},error:failSign ? {} : null};
      }};
    }}
  };
}

test('downloads authorise the media row and point to the original without transformations', async () => {
  const client = downloadClient({storage_path:'player/session/original.mov',original_name:'Original 4K.MOV'});
  const download = await originalMediaDownload(client, 'media-id');
  assert.deepEqual(client.calls.filters,[['id','media-id'],['visibility','player_parent']]);
  assert.deepEqual(client.calls.signed,[['player/session/original.mov',600,{download:'Original 4K.MOV'}]]);
  assert.equal(download.filename,'Original 4K.MOV');
  assert.equal(download.url,'https://storage.example/original');
});

test('inaccessible media never receives a download URL and signing errors are surfaced', async () => {
  const denied = downloadClient(null, {deny:true});
  await assert.rejects(originalMediaDownload(denied, 'media-id'), /no longer available/);
  assert.equal(denied.calls.signed.length, 0);
  const failed = downloadClient({storage_path:'original.mp4'}, {failSign:true});
  await assert.rejects(originalMediaDownload(failed, 'media-id'), /Unable to prepare/);
});


test('oversized video is compressed and uploaded in one call with truthful metadata', async () => {
  const original = {name:'long.MOV',type:'video/quicktime',size:MAX_MEDIA_BYTES+1};
  const prepared = new File(['smaller-video'], 'long-optimised.mp4', {type:'video/mp4'});
  const client = uploadClient(), job = {file:original}, progress = [];
  await uploadSessionMedia(client, job, session, 'coach', {
    compress: async (file, limit) => {assert.equal(file, original); assert.equal(limit, MAX_MEDIA_BYTES); return prepared;},
    onProgress: event => progress.push(event.stage)
  });
  assert.equal(job.file, original);
  assert.equal(client.calls.files[0].file, prepared);
  assert.equal(client.calls.rows[0].original_name, prepared.name);
  assert.equal(client.calls.rows[0].mime_type, 'video/mp4');
  assert.equal(client.calls.rows[0].file_size, prepared.size);
  assert.equal(mediaQualityLabel(client.calls.rows[0]), 'Optimised for upload');
  assert.deepEqual(progress, ['compressing', 'uploading', 'attaching']);
});

test('server size rejection reduces a video automatically, including a second lower limit', async () => {
  const client = uploadClient({errors: [{statusCode:'413'}, {message:'The object exceeded the maximum allowed size'}]});
  const original = new File(['x'.repeat(1000)], 'clip.mov', {type:'video/quicktime'});
  const job = {file:original}, limits = [];
  await uploadSessionMedia(client, job, session, 'coach', {compress:async (file, limit) => {
    assert.equal(file, original); limits.push(limit);
    return new File(['x'.repeat(Math.floor(limit * .8))], 'clip-optimised.webm', {type:'video/webm'});
  }});
  assert.deepEqual(limits, [500, 200]);
  assert.equal(client.calls.files.length, 3);
  assert.equal(client.calls.rows.length, 1);
  assert.equal(client.calls.rows[0].file_size, 160);
  assert.equal(job.linked, true);
  assert.notEqual(client.calls.files[0].path, client.calls.files[1].path);
});

test('prepared video survives upload and metadata failures without being recompressed', async () => {
  const original = {name:'large.mov',type:'video/quicktime',size:MAX_MEDIA_BYTES+1};
  const job = {file:original}; let compressions = 0;
  const options = {compress:async () => {compressions++; return new File(['video'], 'large-optimised.mp4', {type:'video/mp4'});}};
  await assert.rejects(uploadSessionMedia(uploadClient({failUpload:true}), job, session, 'coach', options));
  const prepared = job.preparedFile;
  await assert.rejects(uploadSessionMedia(uploadClient({failMetadata:true}), job, session, 'coach', options));
  const client = uploadClient();
  await uploadSessionMedia(client, job, session, 'coach', options);
  assert.equal(compressions, 1);
  assert.equal(job.preparedFile, prepared);
  assert.equal(client.calls.files.length, 0);
  assert.equal(client.calls.rows[0].file_size, prepared.size);
  assert.equal(job.linked, true);
});

test('failed or oversized conversions never upload or mark media as saved', async () => {
  for (const compress of [async () => {throw new Error('Unsupported codec');}, async file => file]) {
    const client = uploadClient(), job = {file:{name:'long.mov',type:'video/quicktime',size:MAX_MEDIA_BYTES+1}};
    await assert.rejects(uploadSessionMedia(client, job, session, 'coach', {compress}));
    assert.equal(client.calls.files.length, 0);
    assert.equal(client.calls.rows.length, 0);
    assert.equal(job.linked, undefined);
    assert.equal(job.file.name, 'long.mov');
  }
});

test('size fallbacks are bounded and permission errors do not reduce video quality', async () => {
  const client = uploadClient({errors:Array.from({length:8}, () => ({status:413,message:'Too large'}))});
  const job = {file:new File(['x'.repeat(10000)], 'clip.mp4', {type:'video/mp4'})};
  await assert.rejects(uploadSessionMedia(client, job, session, 'coach', {compress:async (_, limit) =>
    new File(['x'.repeat(Math.floor(limit * .8))], 'clip-optimised.mp4', {type:'video/mp4'})}));
  assert.equal(client.calls.files.length, 5);
  assert.equal(client.calls.rows.length, 0);
  assert.equal(isMediaSizeError({code:'EntityTooLarge'}), true);
  assert.equal(isMediaSizeError({statusCode:403,message:'Permission denied'}), false);
  const denied = uploadClient({errors:[{status:403,message:'Permission denied'}]});
  await assert.rejects(uploadSessionMedia(denied, {file:job.file}, session, 'coach', {compress:async () => assert.fail('must not compress')}));
  assert.equal(denied.calls.files.length, 1);
  assert.equal(mediaQualityLabel({storage_path:'player/session/original.mov'}), 'Original quality');
});
