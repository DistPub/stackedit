<template>
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
          <input slot="field" class="textfield" type="text" v-model.trim="description">
        </form-entry>
        <form-entry label="Thumb" info="optional">
          <input slot="field" class="textfield" type="file" accept="image/*" v-on:change="selectThumb">
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
  </template>
  
  <script>
  import blueskyProvider from '../../../services/providers/blueskyProvider';
  import modalTemplate from '../common/modalTemplate';
  
  export default modalTemplate({
    data: () => ({
      title: '',
      description: '',
      thumb: null,
    }),
    computedLocalSettings: {
      selectedTemplate: 'blueskyPublishTemplate',
    },
    created() {
      this.title = this.currentFileName;
    },
    methods: {
      selectThumb(event) {
        this.thumb = event.target.files[0]
      },
      async resolve() {
        if (!this.title) {
          this.setError('title');
        } else {
          // Return new location
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
  