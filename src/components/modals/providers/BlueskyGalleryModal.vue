<template>
  <div class="bluesky-gallery-modal">
    <modal-inner aria-label="Bluesky gallery">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="bluesky"></icon-provider>
      </div>
      <p v-if="!activeToken">
        Select a <b>Bluesky</b> account to open your gallery.
      </p>
      <p v-else>
        Manage images in your <b>Bluesky</b> gallery.
      </p>
      <div v-if="!activeToken">
        <menu-entry @click.native="addAccount">
          <icon-provider slot="icon" provider-id="bluesky"></icon-provider>
          <div>Add Bluesky account</div>
          <span>Link a new account</span>
        </menu-entry>
        <menu-entry @click.native="selectToken(token)" v-for="token in blueskyTokens" :key="token.sub">
          <icon-provider slot="icon" provider-id="bluesky"></icon-provider>
          <div>{{token.handle}}</div>
          <span>{{token.instance}}</span>
        </menu-entry>
        <div v-if="!blueskyTokens.length" class="modal__info">
          No Bluesky account linked.
        </div>
      </div>
      <div v-else class="gallery">
        <div class="gallery__toolbar">
          <button class="button gallery__switch" @click="clearToken">
            <icon-arrow-left></icon-arrow-left>
            <span>Switch account</span>
          </button>
          <button class="button gallery__upload" @click="triggerUpload">
            <icon-upload></icon-upload>
            <span>Upload image</span>
          </button>
          <input
            ref="fileInput"
            class="gallery__file-input"
            type="file"
            accept="image/*"
            @change="uploadImage"
          >
          <div v-if="selectedUris.length" class="gallery__count">
            {{ selectedUris.length }} selected
          </div>
        </div>
        <div v-if="loading" class="modal__info">Loading gallery...</div>
        <div v-else-if="!records.length" class="modal__info">No images found.</div>
        <div v-else class="gallery__grid">
          <div
            v-for="record in records"
            :key="record.uri"
            class="gallery__card"
            :class="{ 'gallery__card--selected': isSelected(record) }"
          >
            <button
              class="gallery__thumb-button"
              type="button"
              @click="openPreview(record)"
            >
              <div
                class="gallery__thumb"
                :style="{backgroundImage: `url(${getImageUrl(record)})`}"
              ></div>
            </button>
            <label
              class="gallery__check"
              :class="{ 'gallery__check--checked': isSelected(record) }"
              :aria-label="`Select ${record.value.name || 'image'}`"
            >
              <input
                type="checkbox"
                class="gallery__check-input"
                :checked="isSelected(record)"
                @change="toggleSelect(record)"
              >
              <span class="gallery__check-box" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path
                    d="M3 8.5 L6.5 12 L13 4.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </label>
            <div class="gallery__name" :title="record.value.name || 'image'">
              {{ record.value.name || 'image' }}
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="activeToken && selectedUris.length" class="modal__button-bar">
      <button
        class="button gallery__danger"
        @click="deleteSelected"
      >Delete selected</button>
      <button
        class="button button--resolve"
        @click="insertSelected"
      >Insert selected</button>
    </div>
    <div
      v-if="previewRecord"
      class="lightbox"
      role="dialog"
      aria-label="Image preview"
      @click.self="closePreview"
    >
      <button
        class="lightbox__close button not-tabbable"
        type="button"
        @click="closePreview"
        aria-label="Close preview"
      >
        <icon-close></icon-close>
      </button>
      <figure class="lightbox__figure" @click.stop>
        <img
          class="lightbox__image"
          :src="getImageUrl(previewRecord)"
          :alt="previewRecord.value.name || 'image'"
        >
        <figcaption v-if="previewRecord.value.name" class="lightbox__caption">
          {{ previewRecord.value.name }}
        </figcaption>
      </figure>
    </div>
  </modal-inner>
</div>
</template>

<script>
import modalTemplate from '../common/modalTemplate';
import MenuEntry from '../../menus/common/MenuEntry';
import editorSvc from '../../../services/editorSvc';
import galleryHelper from '../../../services/providers/helpers/galleryHelper';
import blueskyHelper from '../../../services/providers/helpers/blueskyHelper';
import store from '../../../store';

export default modalTemplate({
  components: {
    MenuEntry,
  },
  data: () => ({
    activeToken: null,
    records: [],
    loading: false,
    selectedUris: [],
    previewRecord: null,
  }),
  computed: {
    blueskyTokens() {
      const blueskyTokensBySub = store.getters['data/blueskyTokensBySub'];
      return Object.values(blueskyTokensBySub)
        .sort((token1, token2) => token1.handle.localeCompare(token2.handle));
    },
  },
  async created() {
    if (this.config.token) {
      this.activeToken = this.config.token;
      await this.fetchRecords();
    }
  },
  methods: {
    selectToken(token) {
      this.activeToken = token;
      this.selectedUris = [];
      this.previewRecord = null;
      this.fetchRecords();
    },
    async addAccount() {
      try {
        const { instance, handle, password } = await store.dispatch('modal/open', {
          type: 'blueskyAccount',
        });
        await blueskyHelper.addAccount(instance, handle, password);
      } catch (e) { /* cancel */ }
    },
    clearToken() {
      this.activeToken = null;
      this.records = [];
      this.selectedUris = [];
      this.previewRecord = null;
    },
    async fetchRecords() {
      if (!this.activeToken) {
        return;
      }
      this.loading = true;
      try {
        this.records = await galleryHelper.listGallery(this.activeToken);
        this.selectedUris = this.selectedUris.filter((uri) => this.records.some((r) => r.uri === uri));
      } catch (err) {
        store.dispatch('notification/error', err.message || err);
      } finally {
        this.loading = false;
      }
    },
    getImageUrl(record) {
      const cid = record.value.image && record.value.image.ref && record.value.image.ref.$link;
      if (!cid) {
        return '';
      }
      return galleryHelper.getGalleryImageUrl(this.activeToken, cid);
    },
    isSelected(record) {
      return this.selectedUris.indexOf(record.uri) !== -1;
    },
    toggleSelect(record) {
      const index = this.selectedUris.indexOf(record.uri);
      if (index === -1) {
        this.selectedUris.push(record.uri);
      } else {
        this.selectedUris.splice(index, 1);
      }
    },
    openPreview(record) {
      this.previewRecord = record;
    },
    closePreview() {
      this.previewRecord = null;
    },
    triggerUpload() {
      const input = this.$refs.fileInput;
      if (input) {
        input.click();
      }
    },
    async uploadImage(event) {
      const file = event.target.files[0];
      if (!file || !this.activeToken) {
        return;
      }
      try {
        await galleryHelper.uploadGalleryImage(this.activeToken, file);
        await this.fetchRecords();
      } catch (err) {
        store.dispatch('notification/error', err.message || err);
      }
      // Reset the file input so the same file can be selected again
      event.target.value = '';
    },
    async deleteSelected() {
      if (!this.activeToken || !this.selectedUris.length) {
        return;
      }
      const count = this.selectedUris.length;
      const message = count === 1
        ? 'Are you sure you want to delete this image?'
        : `Are you sure you want to delete ${count} images?`;
      if (!window.confirm(message)) {
        return;
      }
      const uris = this.selectedUris.slice();
      const failures = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const uri of uris) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await galleryHelper.deleteGalleryImage(this.activeToken, uri);
        } catch (err) {
          failures.push({ uri, err });
        }
      }
      if (failures.length) {
        const failedCount = failures.length;
        store.dispatch(
          'notification/error',
          `Failed to delete ${failedCount} image${failedCount === 1 ? '' : 's'}.`,
        );
      }
      this.selectedUris = [];
      if (this.previewRecord && uris.indexOf(this.previewRecord.uri) !== -1) {
        this.previewRecord = null;
      }
      await this.fetchRecords();
    },
    insertImage(record) {
      const url = this.getImageUrl(record);
      if (!url) {
        return;
      }
      const { selectionMgr } = editorSvc.clEditor;
      const selectionStart = Math.min(selectionMgr.selectionStart, selectionMgr.selectionEnd);
      const selectionEnd = Math.max(selectionMgr.selectionStart, selectionMgr.selectionEnd);
      const markdown = `![${record.value.name || 'image'}](${url})`;
      editorSvc.clEditor.replace(selectionStart, selectionEnd, markdown);
    },
    insertSelected() {
      if (!this.selectedUris.length) {
        return;
      }
      const selectedRecords = this.records.filter((r) => this.selectedUris.indexOf(r.uri) !== -1);
      const markdown = selectedRecords
        .map((r) => {
          const url = this.getImageUrl(r);
          return url ? `![${r.value.name || 'image'}](${url})` : '';
        })
        .filter(Boolean)
        .join('\n\n');
      if (!markdown) {
        return;
      }
      const { selectionMgr } = editorSvc.clEditor;
      const selectionStart = Math.min(selectionMgr.selectionStart, selectionMgr.selectionEnd);
      const selectionEnd = Math.max(selectionMgr.selectionStart, selectionMgr.selectionEnd);
      editorSvc.clEditor.replace(selectionStart, selectionEnd, markdown);
      this.config.resolve();
      editorSvc.clEditor.focus();
    },
  },
});
</script>

<style lang="scss" scoped>
@import '../../../styles/variables.scss';

.gallery {
  margin: 1em 0 0;
}

.gallery__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75em;
  margin: 0 0 0.75em;
}

.gallery__upload,
.gallery__switch {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  text-transform: none;
  letter-spacing: 0;
  padding: 8px 14px;
  border-radius: $border-radius-base;
  white-space: nowrap;

  svg {
    flex: none;
    width: 16px;
    height: 16px;
  }
}

.gallery__upload {
  background-color: rgba(52, 155, 232, 0.08);
  color: $link-color;
  font-weight: 600;
  border: 1px dashed rgba(52, 155, 232, 0.55);
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover,
  &:focus,
  &:active {
    background-color: rgba(52, 155, 232, 0.15);
    border-color: $link-color;
    color: $link-color;
  }
}

.gallery__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.gallery__count {
  font-size: 0.85em;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.gallery__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  max-height: 52vh;
  overflow-y: auto;
  padding: 4px;
  margin: 0 -4px;
  scrollbar-width: thin;

  @media (min-width: 520px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (min-width: 760px) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.gallery__card {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: $border-radius-base;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    border-color: rgba(52, 155, 232, 0.45);
    box-shadow: 0 2px 8px rgba(52, 155, 232, 0.15);
  }
}

.gallery__card--selected {
  border-color: $link-color;
  box-shadow: 0 0 0 2px rgba(52, 155, 232, 0.35), 0 2px 8px rgba(52, 155, 232, 0.18);
}

.gallery__thumb-button {
  display: block;
  width: 100%;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
  border-radius: 0;

  &:hover,
  &:focus,
  &:active {
    background: transparent;
  }
}

.gallery__thumb {
  width: 100%;
  padding-bottom: 100%; // 1:1 aspect ratio square
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  background-color: rgba(0, 0, 0, 0.04);
}

.gallery__name {
  padding: 6px 8px;
  font-size: 0.78em;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
  background-color: #fff;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.gallery__check {
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  cursor: pointer;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(2px);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: background-color 0.15s ease, color 0.15s ease;
  color: transparent;

  &:hover {
    background-color: #fff;
    color: rgba(0, 0, 0, 0.4);
  }
}

.gallery__check--checked,
.gallery__check--checked:hover {
  background-color: $link-color;
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.gallery__check--checked:hover {
  background-color: darken($link-color, 8%);
}

.gallery__check-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.gallery__check-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.gallery__danger {
  color: $error-color;
  font-weight: 600;

  &:hover,
  &:focus,
  &:active {
    background-color: rgba(243, 51, 51, 0.08);
    color: $error-color;
  }

  &[disabled] {
    &,
    &:hover,
    &:focus,
    &:active {
      color: $error-color;
      background-color: transparent;
    }
  }
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.78);
  padding: 24px;
  animation: gallery-lightbox-fade 0.18s ease-out;
}

@keyframes gallery-lightbox-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.lightbox__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.92);
  color: #333;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover,
  &:focus,
  &:active {
    background-color: #fff;
    color: #000;
  }
}

.lightbox__figure {
  margin: 0;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: gallery-lightbox-zoom 0.22s ease-out;
}

@keyframes gallery-lightbox-zoom {
  from {
    transform: scale(0.94);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.lightbox__image {
  display: block;
  max-width: min(92vw, 1100px);
  max-height: 80vh;
  width: auto;
  height: auto;
  border-radius: $border-radius-base;
  background-color: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  object-fit: contain;
}

.lightbox__caption {
  color: rgba(255, 255, 255, 0.92);
  font-size: 0.95em;
  text-align: center;
  padding: 6px 12px;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: $border-radius-base;
  max-width: 80vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal__button-bar {
  .button {
    flex: 0 0 auto;
    min-width: auto;
    overflow: visible;
  }

  .gallery__danger {
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>

<style lang="scss">
// Make the gallery modal wider and keep it centered.
// This targets the modal shell rendered by ModalInner, so it lives in a
// non-scoped block scoped by the wrapper class.
.bluesky-gallery-modal .modal__inner-1 {
  width: 94vw;
  max-width: 1024px;
  margin-left: auto;
  margin-right: auto;
}

.bluesky-gallery-modal .modal__inner-2 {
  width: 100%;
  max-width: none;
}
</style>
