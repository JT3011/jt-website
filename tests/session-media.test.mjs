import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_MEDIA_BYTES, mediaFileType, mediaSizeLabel, validateOriginalMedia, uploadOriginalMedia, originalMediaDownload } from '../performance-hub-session-media.js';

const session = { player_user_id: 'player', session_id: 'session' };
function uploadClient({failUpload = false, failMetadata = false, existing = null} = {}) {
  const calls = { files: [], rows: [] };
  return {
    calls,
    storage: { from(bucket) {
      assert.equal(bucket, 'session-media');
      return { async upload(path, file, options) {
        calls.files.push({path, file, options});
        return {error: failUpload ? {message: 'Connection interrupted'} : null};
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
  await uploadOriginalMedia(client, job, session, 'coach');
  assert.equal(client.calls.files[0].file, file);
  assert.deepEqual(new Uint8Array(await client.calls.files[0].file.arrayBuffer()), bytes);
  assert.deepEqual(client.calls.files[0].options, {upsert:false,contentType:'video/quicktime'});
  assert.equal(client.calls.rows[0].file_size, bytes.length);
  assert.equal(client.calls.rows[0].original_name, 'Original 4K.MOV');
  assert.equal(client.calls.rows[0].visibility, 'player_parent');
  await uploadOriginalMedia(client, job, session, 'coach');
  assert.equal(client.calls.files.length, 1);
  assert.equal(client.calls.rows.length, 1);
});

test('oversized, empty and non-media files fail before anything is written', async () => {
  const client = uploadClient();
  for (const file of [
    {name:'long.mov',type:'video/quicktime',size:MAX_MEDIA_BYTES+1},
    new File([], 'empty.mp4', {type:'video/mp4'}),
    new File(['not media'], 'file.html', {type:'text/html'})
  ]) await assert.rejects(uploadOriginalMedia(client, {file}, session, 'coach'));
  assert.equal(client.calls.files.length, 0);
  assert.equal(client.calls.rows.length, 0);
  assert.doesNotThrow(() => validateOriginalMedia({name:'limit.mp4',type:'video/mp4',size:MAX_MEDIA_BYTES}));
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
  await assert.rejects(uploadOriginalMedia(failed, job, session, 'coach'), /Connection interrupted/);
  assert.equal(job.linked, undefined);
  assert.equal(failed.calls.rows.length, 0);
  const working = uploadClient();
  await uploadOriginalMedia(working, job, session, 'coach');
  assert.equal(job.linked, true);
});

test('metadata retries reuse the uploaded original and reconcile a lost insert response', async () => {
  const job = {file:new File(['video'], 'clip.mp4', {type:'video/mp4'})};
  const failed = uploadClient({failMetadata:true});
  await assert.rejects(uploadOriginalMedia(failed, job, session, 'coach'), /attach/);
  assert.equal(job.uploaded, true);
  const working = uploadClient({failMetadata:true,existing:{id:'saved-media'}});
  await uploadOriginalMedia(working, job, session, 'coach');
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
