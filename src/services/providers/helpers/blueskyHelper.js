import utils from '../../utils';
import networkSvc from '../../networkSvc';
import store from '../../../store';
import userSvc from '../../userSvc';
import badgeSvc from '../../badgeSvc';

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
    let data = {
        identifier,
        password
    }
    const result = await networkSvc.xrpc(
      instance,
      'com.atproto.server.createSession',
      { data }
    );
    let jwt = result.accessJwt
    let did = result.did
    let handle = result.handle

    const token = {
      instance,
      jwt,
      did,
      handle,
      sub: did,
    };

    // Add token
    store.dispatch('data/addBlueskyToken', token);
    return token;
  },
  async addAccount(instance, handle, password) {
    const token = await this.auth(instance, handle, password);
    badgeSvc.addBadge('addBlueskyAccount');
    return token
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
