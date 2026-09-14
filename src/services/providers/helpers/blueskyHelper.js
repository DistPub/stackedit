import utils from '../../utils';
import networkSvc from '../../networkSvc';
import store from '../../../store';
import userSvc from '../../userSvc';
import badgeSvc from '../../badgeSvc';

const AUTH_ERROR_CODES = ['AuthRequired', 'ExpiredToken', 'InvalidToken'];

const isAuthError = (result) => result && typeof result === 'object'
  && AUTH_ERROR_CODES.indexOf(result.error) !== -1;

const createTokenFromSession = (instance, result) => ({
  instance,
  jwt: result.accessJwt,
  refreshJwt: result.refreshJwt,
  did: result.did,
  handle: result.handle,
  sub: result.did,
});

const request = ({ accessToken, serverUrl }, options) => networkSvc.request({
  ...options,
  url: `${serverUrl}/api/v4/${options.url}`,
  headers: {
    ...options.headers || {},
    Authorization: `Bearer ${accessToken}`,
  },
})
  .then(res => res.body);

const getCommitMessage = (name, path) => {
  const message = store.getters['data/computedSettings'].git[name];
  return message.replace(/{{path}}/g, path);
};

/**
 * https://docs.gitlab.com/ee/api/users.html#for-user
 */
const subPrefix = 'gl';
userSvc.setInfoResolver('gitlab', subPrefix, async (sub) => {
  try {
    const [, serverUrl, id] = sub.match(/^(.+)\/([^/]+)$/);
    const user = (await networkSvc.request({
      url: `${serverUrl}/api/v4/users/${id}`,
    })).body;
    const uniqueSub = `${serverUrl}/${user.id}`;

    return {
      id: `${subPrefix}:${uniqueSub}`,
      name: user.username,
      imageUrl: user.avatar_url || '',
    };
  } catch (err) {
    if (err.status !== 404) {
      throw new Error('RETRY');
    }
    throw err;
  }
});

export default {
  async auth(instance, identifier, password) {
    const result = await networkSvc.xrpc(
      instance,
      'com.atproto.server.createSession',
      { data: { identifier, password } },
    );
    if (result.error) {
      throw new Error(`${result.error} ${result.message || ''}`.trim());
    }
    const token = createTokenFromSession(instance, result);
    store.dispatch('data/addBlueskyToken', token);
    return token;
  },
  async addAccount(instance, handle, password) {
    const token = await this.auth(instance, handle, password);
    badgeSvc.addBadge('addBlueskyAccount');
    return token;
  },
  async refreshTokenSilently(token) {
    if (token.refreshJwt) {
      try {
        const result = await networkSvc.xrpc(
          token.instance,
          'com.atproto.server.refreshSession',
          { jwt: token.refreshJwt, method: 'POST' },
        );
        if (result.accessJwt && !result.error) {
          const updatedToken = {
            ...token,
            jwt: result.accessJwt,
            refreshJwt: result.refreshJwt || token.refreshJwt,
          };
          store.dispatch('data/addBlueskyToken', updatedToken);
          return updatedToken;
        }
      } catch (e) { /* fall through to stored-credentials re-auth */ }
    }
    const { blueskyInstance, blueskyHandle, blueskyPassword } = store.getters['data/localSettings'];
    if (blueskyInstance && blueskyHandle && blueskyPassword) {
      try {
        const result = await networkSvc.xrpc(
          blueskyInstance,
          'com.atproto.server.createSession',
          { data: { identifier: blueskyHandle, password: blueskyPassword } },
        );
        if (!result.error && result.did === token.sub) {
          const freshToken = createTokenFromSession(blueskyInstance, result);
          store.dispatch('data/addBlueskyToken', freshToken);
          return freshToken;
        }
      } catch (e) { /* fall through */ }
    }
    return null;
  },
  async promptLogin() {
    try {
      const { instance, handle, password } = await store.dispatch('modal/open', {
        type: 'blueskyAccount',
      });
      return await this.auth(instance, handle, password);
    } catch (e) {
      return null;
    }
  },
  async xrpcWithAuth(token, method, options = {}) {
    let result = await networkSvc.xrpc(token.instance, method, {
      ...options,
      jwt: token.jwt,
    });
    if (!isAuthError(result)) {
      return result;
    }
    let freshToken = await this.refreshTokenSilently(token);
    if (!freshToken) {
      freshToken = await this.promptLogin();
    }
    if (!freshToken) {
      throw new Error(`${result.error} ${result.message || ''}`.trim());
    }
    Object.assign(token, freshToken);
    result = await networkSvc.xrpc(token.instance, method, {
      ...options,
      jwt: token.jwt,
    });
    if (isAuthError(result)) {
      throw new Error(`${result.error} ${result.message || ''}`.trim());
    }
    return result;
  },

  /**
   * https://docs.gitlab.com/ee/api/projects.html#get-single-project
   */
  async getProjectId(token, { projectPath, projectId }) {
    if (projectId) {
      return projectId;
    }

    const project = await request(token, {
      url: `projects/${encodeURIComponent(projectPath)}`,
    });
    return project.id;
  },

  /**
   * https://docs.gitlab.com/ee/api/repositories.html#list-repository-tree
   */
  async getTree({
    token,
    projectId,
    branch,
  }) {
    return request(token, {
      url: `projects/${encodeURIComponent(projectId)}/repository/tree`,
      params: {
        ref: branch,
        recursive: true,
        per_page: 9999,
      },
    });
  },

  /**
   * https://docs.gitlab.com/ee/api/commits.html#list-repository-commits
   */
  async getCommits({
    token,
    projectId,
    branch,
    path,
  }) {
    return request(token, {
      url: `projects/${encodeURIComponent(projectId)}/repository/commits`,
      params: {
        ref_name: branch,
        path,
      },
    });
  },

  /**
   * https://docs.gitlab.com/ee/api/repository_files.html#create-new-file-in-repository
   * https://docs.gitlab.com/ee/api/repository_files.html#update-existing-file-in-repository
   */
  async uploadFile({
    token,
    projectId,
    branch,
    path,
    content,
    sha,
  }) {
    return request(token, {
      method: sha ? 'PUT' : 'POST',
      url: `projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(path)}`,
      body: {
        commit_message: getCommitMessage(sha ? 'updateFileMessage' : 'createFileMessage', path),
        content,
        last_commit_id: sha,
        branch,
      },
    });
  },

  /**
   * https://docs.gitlab.com/ee/api/repository_files.html#delete-existing-file-in-repository
   */
  async removeFile({
    token,
    projectId,
    branch,
    path,
    sha,
  }) {
    return request(token, {
      method: 'DELETE',
      url: `projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(path)}`,
      body: {
        commit_message: getCommitMessage('deleteFileMessage', path),
        last_commit_id: sha,
        branch,
      },
    });
  },

  /**
   * https://docs.gitlab.com/ee/api/repository_files.html#get-file-from-repository
   */
  async downloadFile({
    token,
    projectId,
    branch,
    path,
  }) {
    const res = await request(token, {
      url: `projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(path)}`,
      params: { ref: branch },
    });
    return {
      sha: res.last_commit_id,
      data: utils.decodeBase64(res.content),
    };
  },
};
