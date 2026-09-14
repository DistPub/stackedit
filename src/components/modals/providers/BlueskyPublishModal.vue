<template>
  <div class="bluesky-publish-modal">
    <modal-inner aria-label="Publish to Bluesky">
      <div class="modal__content">
        <div class="modal__image">
          <icon-provider provider-id="bluesky"></icon-provider>
        </div>
        <p>Publish <b>{{currentFileName}}</b> to a <b>Bluesky Post</b>.</p>
        <form-entry label="Title" error="title">
          <input slot="field" class="textfield" type="text" v-model.trim="title">
        </form-entry>
        <form-entry label="Description" error="description">
          <textarea
            slot="field"
            class="textfield bluesky-publish__description"
            v-model="description"
            rows="4"
          ></textarea>
        </form-entry>
        <form-entry label="Thumb" info="optional">
          <div slot="field" class="bluesky-publish__thumb">
            <div v-if="thumbPreviewUrl" class="bluesky-publish__thumb-preview">
              <img class="bluesky-publish__thumb-image" :src="thumbPreviewUrl" :alt="thumbName">
              <span class="bluesky-publish__thumb-name" :title="thumbName">{{ thumbName }}</span>
              <button
                class="button bluesky-publish__thumb-clear"
                @click="clearThumb"
                aria-label="Remove thumbnail"
                v-title="'Remove thumbnail'"
              >
                <icon-close></icon-close>
              </button>
            </div>
            <div v-else class="bluesky-publish__thumb-buttons">
              <button
                class="button bluesky-publish__thumb-button"
                @click="triggerUpload"
              >
                <icon-upload></icon-upload>
                <span>Upload image</span>
              </button>
              <button
                class="button bluesky-publish__thumb-button"
                @click="pickFromGallery"
              >
                <icon-file-image></icon-file-image>
                <span>From Bluesky gallery</span>
              </button>
            </div>
            <input
              ref="fileInput"
              class="bluesky-publish__file-input"
              type="file"
              accept="image/*"
              @change="selectThumb"
            >
          </div>
        </form-entry>
        <form-entry label="Template">
          <select slot="field" class="textfield" v-model="selectedTemplate">
            <option v-for="(template, id) in allTemplatesById" :key="id" :value="id">
              {{ template.name }}
            </option>
          </select>
          <div class="form-entry__actions">
            <a href="javascript:void(0)" @click="configureTemplates">Configure templates</a>
          </div>
        </form-entry>
        <div class="modal__info">
          <b>ProTip:</b> You can provide a value for <code>title</code> in the <a href="javascript:void(0)" @click="openFileProperties">file properties</a>.
        </div>
      </div>
      <div class="modal__button-bar">
        <button class="button" @click="config.reject()">Cancel</button>
        <button class="button button--resolve" @click="resolve()">Ok</button>
      </div>
    </modal-inner>
  </div>
</template>

<script>
import blueskyProvider from '../../../services/providers/blueskyProvider';
import modalTemplate from '../common/modalTemplate';
import store from '../../../store';

export default modalTemplate({
  data: () => ({
    title: '',
    description: '',
    thumb: null,
    thumbName: '',
    thumbPreviewUrl: '',
  }),
  computedLocalSettings: {
    selectedTemplate: 'blueskyPublishTemplate',
  },
  created() {
    this.title = this.config.savedTitle !== undefined
      ? this.config.savedTitle
      : this.currentFileName;
    if (this.config.savedDescription !== undefined) {
      this.description = this.config.savedDescription;
    }
    if (this.config.savedThumb !== undefined) {
      this.thumb = this.config.savedThumb;
      this.thumbName = this.config.savedThumbName || '';
      this.thumbPreviewUrl = this.config.savedThumbPreviewUrl || '';
    }
  },
  methods: {
    saveState() {
      this.config.savedTitle = this.title;
      this.config.savedDescription = this.description;
      this.config.savedThumb = this.thumb;
      this.config.savedThumbName = this.thumbName;
      this.config.savedThumbPreviewUrl = this.thumbPreviewUrl;
    },
    triggerUpload() {
      const input = this.$refs.fileInput;
      if (input) {
        input.click();
      }
    },
    selectThumb(event) {
      const file = event.target.files[0];
      if (!file) {
        return;
      }
      this.setThumb(file, file.name, URL.createObjectURL(file));
      event.target.value = '';
    },
    async pickFromGallery() {
      this.saveState();
      const parentConfig = this.config;
      try {
        await store.dispatch('modal/open', {
          type: 'blueskyGallery',
          token: this.config.token,
          pickerMode: true,
          onPick: (result) => {
            parentConfig.savedThumb = result.blob;
            parentConfig.savedThumbName = result.name;
            parentConfig.savedThumbPreviewUrl = result.url;
          },
        });
      } catch (e) { /* cancel */ }
    },
    setThumb(thumb, name, previewUrl) {
      if (this.thumbPreviewUrl && this.thumbPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.thumbPreviewUrl);
      }
      this.thumb = thumb;
      this.thumbName = name;
      this.thumbPreviewUrl = previewUrl;
    },
    clearThumb() {
      if (this.thumbPreviewUrl && this.thumbPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.thumbPreviewUrl);
      }
      this.thumb = null;
      this.thumbName = '';
      this.thumbPreviewUrl = '';
    },
    async resolve() {
      if (!this.title) {
        this.setError('title');
      } else {
        const location = await blueskyProvider.makeLocation(
          this.config.token,
          this.title,
          this.description,
          this.thumb,
        );
        location.templateId = this.selectedTemplate;
        this.config.resolve(location);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
@import '../../../styles/variables.scss';

.bluesky-publish__description {
  display: block;
  width: 100%;
  height: auto;
  min-height: 5rem;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
  padding: 0.5em;
  border: 0;
}

.bluesky-publish__thumb {
  display: block;
}

.bluesky-publish__thumb-buttons {
  display: flex;
  gap: 0.75em;
  flex-wrap: wrap;
}

.bluesky-publish__thumb-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  text-transform: none;
  letter-spacing: 0;
  padding: 8px 14px;
  border-radius: $border-radius-base;
  white-space: nowrap;
  border: 1px dashed rgba(0, 0, 0, 0.25);
  background-color: rgba(0, 0, 0, 0.02);

  &:hover,
  &:focus,
  &:active {
    background-color: rgba(52, 155, 232, 0.08);
    border-color: $link-color;
    color: $link-color;
  }

  svg {
    flex: none;
    width: 18px;
    height: 18px;
  }
}

.bluesky-publish__thumb-preview {
  display: flex;
  align-items: center;
  gap: 0.75em;
}

.bluesky-publish__thumb-image {
  flex: none;
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: $border-radius-base;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.bluesky-publish__thumb-name {
  flex: 1;
  min-width: 0;
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bluesky-publish__thumb-clear {
  flex: none;
  width: 32px;
  height: 32px;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0.6;

  &:hover,
  &:focus,
  &:active {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.08);
  }

  svg {
    width: 18px;
    height: 18px;
  }
}

.bluesky-publish__file-input {
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
</style>

<style lang="scss">
.bluesky-publish-modal .modal__inner-1 {
  width: 94vw;
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
}

.bluesky-publish-modal .modal__inner-2 {
  width: 100%;
  max-width: none;
}
</style>
