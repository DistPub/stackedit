import networkSvc from '../../networkSvc';

const GALLERY_COLLECTION = 'com.hukoubook.stackedit.gallery';
const FATESKY_CDN_BASE_URL = 'https://fatesky-cdn.hukoubook.com/img/feed_thumbnail/plain';

const checkResult = (result) => {
  if (result.error) {
    throw new Error(`${result.error} ${result.message}`);
  }
};

export default {
  /**
   * List gallery records from the user's PDS.
   * @param {{instance: string, jwt: string, did: string, handle: string, sub: string}} token
   * @returns {Promise<Array<{uri: string, cid: string, value: Object}>>}
   */
  async listGallery(token) {
    const result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.listRecords', {
      params: {
        repo: token.did,
        collection: GALLERY_COLLECTION,
        limit: 100,
      },
      jwt: token.jwt,
    });
    checkResult(result);
    return result.records || [];
  },

  /**
   * Upload an image to the gallery: upload the blob then create the gallery record.
   * @param {{instance: string, jwt: string, did: string, handle: string, sub: string}} token
   * @param {File} file
   * @returns {Promise<{uri: string, cid: string, blob: Object}>}
   */
  async uploadGalleryImage(token, file) {
    let result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.uploadBlob', {
      data: file,
      jwt: token.jwt,
    });
    checkResult(result);
    const blob = result.blob;
    const data = {
      repo: token.did,
      collection: GALLERY_COLLECTION,
      record: {
        $type: GALLERY_COLLECTION,
        name: file.name,
        image: blob,
        createdAt: new Date().toISOString(),
      },
    };
    result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.createRecord', { data, jwt: token.jwt });
    checkResult(result);
    return {
      uri: result.uri,
      cid: result.cid,
      blob,
    };
  },

  /**
   * Delete a gallery record from the user's PDS.
   * @param {{instance: string, jwt: string, did: string, handle: string, sub: string}} token
   * @param {string} uri
   */
  async deleteGalleryImage(token, uri) {
    const rkey = uri.split('/').pop();
    const data = {
      repo: token.did,
      collection: GALLERY_COLLECTION,
      rkey,
    };
    const result = await networkSvc.xrpc(token.instance, 'com.atproto.repo.deleteRecord', { data, jwt: token.jwt });
    checkResult(result);
    return result;
  },

  /**
   * Build the Fatesky CDN thumbnail URL for a gallery image blob.
   * @param {{did: string}} token
   * @param {string} cid
   * @returns {string}
   */
  getGalleryImageUrl(token, cid) {
    return `${FATESKY_CDN_BASE_URL}/${token.did}/${cid}`;
  },
};
