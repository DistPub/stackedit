import store from '../../store';
import githubHelper from './helpers/githubHelper';
import Provider from './common/Provider';
import utils from '../utils';
import userSvc from '../userSvc';
import networkSvc from '../networkSvc';
import {TID} from '@atproto/common-web';
import { RichText, BskyAgent } from '@atproto/api'

const agent = new BskyAgent({
  service: 'https://bsky.social'
})
let tid = undefined;

export default new Provider({
  id: 'bluesky',
  name: 'Bluesky',
  getToken({ sub }) {
    return store.getters['data/blueskyTokensBySub'][sub];
  },
  getLocationUrl({ uri }) {
    return uri;
  },
  getLocationDescription({ title }) {
    return title;
  },
  async downloadContent(token, syncLocation) {
    const content = await githubHelper.downloadGist({
      ...syncLocation,
      token,
    });
    return Provider.parseContent(content, `${syncLocation.fileId}/content`);
  },
  async uploadContent(token, content, syncLocation) {
    const file = store.state.file.itemsById[syncLocation.fileId];
    const description = utils.sanitizeName(file && file.name);
    const gist = await githubHelper.uploadGist({
      ...syncLocation,
      token,
      description,
      content: Provider.serializeContent(content),
    });
    return {
      ...syncLocation,
      gistId: gist.id,
    };
  },
  async publish(token, html, metadata, publishLocation) {
    const blob = new Blob([html], { type: "text/html" });
    const file = new File([blob], `${publishLocation.title}.html`, { type: "text/html" });
    let result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.uploadBlob', {data: file, jwt: token.jwt})

    if (result.error) {
      throw Error(`${result.error} ${result.message}`);
    }
    let blog = result.blob

    const tags = [...metadata.categories, ...metadata.tags].map(item => `#${item}`)
    metadata.date = metadata.date.toISOString()
    let lines = [
      metadata.title ?? publishLocation.title,
      `${metadata.date} ${metadata.author ?? ''}`,
      tags.join(' '),
      metadata.excerpt ?? publishLocation.description,
    ]
    lines = lines.filter(item => item.length > 0)
    const rt = new RichText({
      text: lines.join('\n'),
    })
    await rt.detectFacets(agent)

    let thumb = undefined
    if (publishLocation.thumb) {
      result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.uploadBlob', {data: publishLocation.thumb, jwt: token.jwt})
      thumb = result.blob
    }
    const external = {
      uri: publishLocation.uri,
      title: publishLocation.title,
      description: publishLocation.description,
      thumb,
      blobs: publishLocation.blobs,
      blog,
      meta: metadata,
    }
    let data = {
        repo: token.did,
        "collection": "app.bsky.feed.post",
        rkey: publishLocation.rkey,
        "record": {
            "$type": "app.bsky.feed.post",
            text: rt.text,
            facets: rt.facets,
            "createdAt": new Date().toISOString(),
            "embed": {
                "$type": "app.bsky.embed.external",
                external
            }
        }
    }
    result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.putRecord', { data, jwt: token.jwt })
    const indexPost = {
      repo: token.did,
      "collection": "com.hukoubook.ebtp.post",
      rkey: publishLocation.rkey,
      "record": {
        "$type": "com.hukoubook.ebtp.post",
        "subject": `at://${token.did}/app.bsky.feed.post/${publishLocation.rkey}`,
        "createdAt": new Date().toISOString()
      }
    }
    await networkSvc.xrpc(token.instance, 'com.atproto.repo.putRecord', { data: indexPost, jwt: token.jwt })
    return {
      ...publishLocation,
    };
  },
  async currentEBTPGate(token) {
    let params = {repo: token.did, collection: 'com.hukoubook.ebtp.gate', rkey: 'self'}
    let result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.getRecord', {params})
    return result?.value?.service
  },
  async configEBTPGate(token, service) {
    let data = {
        repo: token.did,
        "collection": "com.hukoubook.ebtp.gate",
        rkey: 'self',
        "record": {
            "$type": "com.hukoubook.ebtp.gate",
            service,
            "createdAt": new Date().toISOString()
        }
    }
    let result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.putRecord', {data, jwt: token.jwt})
    if (result.error) {
      throw Error(`${result.error} ${result.message}`);
    }
  },
  async makeLocation(token, title, description, thumb) {
    tid = TID.next(tid)
    const rkey = tid.toString()
    const postAt = `at://${token.did}/app.bsky.feed.post/${rkey}`
    let service = await this.currentEBTPGate(token)
    let defaultService = 'https://ebtp.hukoubook.com/go?u=${postAt}'
    let uri = utils.convertStringToTemplate(service ?? defaultService, {postAt, did: token.did, handle: token.handle, rkey})
    return {
      providerId: this.id,
      sub: token.sub,
      postAt,
      rkey,
      title,
      description,
      thumb,
      uri,
    };
  },
  async listFileRevisions({ token, syncLocation }) {
    const entries = await githubHelper.getGistCommits({
      ...syncLocation,
      token,
    });

    return entries.map((entry) => {
      const sub = `${githubHelper.subPrefix}:${entry.user.id}`;
      userSvc.addUserInfo({ id: sub, name: entry.user.login, imageUrl: entry.user.avatar_url });
      return {
        sub,
        id: entry.version,
        created: new Date(entry.committed_at).getTime(),
      };
    });
  },
  async loadFileRevision() {
    // Revision are already loaded
    return false;
  },
  async getFileRevisionContent({
    token,
    contentId,
    syncLocation,
    revisionId,
  }) {
    const data = await githubHelper.downloadGistRevision({
      ...syncLocation,
      token,
      sha: revisionId,
    });
    return Provider.parseContent(data, contentId);
  },
});
