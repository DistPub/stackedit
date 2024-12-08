<template>
  <modal-inner aria-label="Link Bluesky account">
    <div class="modal__content">
      <div class="modal__image">
        <icon-provider provider-id="blueksy"></icon-provider>
      </div>
      <p>Link your <b>Bluesky</b> account to <b>StackEdit</b>.</p>
      <form-entry label="Blueksy PDS instance URL" error="instance">
        <input slot="field" class="textfield" type="text" v-model.trim="instance" @keydown.enter="resolve()">
        <div class="form-entry__info">
          <b>Example:</b> bsky.social
        </div>
      </form-entry>
      <form-entry label="Handle/Email" error="handle">
        <input slot="field" class="textfield" type="text" v-model.trim="handle" @keydown.enter="resolve()">
      </form-entry>
      <form-entry label="App Password" error="password">
        <input slot="field" class="textfield" type="password" v-model.trim="password" @keydown.enter="resolve()">
      </form-entry>
    </div>
    <div class="modal__button-bar">
      <button class="button" @click="config.reject()">Cancel</button>
      <button class="button button--resolve" @click="resolve()">Ok</button>
    </div>
  </modal-inner>
</template>

<script>
import modalTemplate from '../common/modalTemplate';

export default modalTemplate({
  computedLocalSettings: {
    instance: 'blueskyInstance',
    handle: 'blueskyHandle',
    password: 'blueskyPassword',
  },
  methods: {
    resolve() {
      if (!this.instance) {
        this.setError('instance');
      }
      if (!this.handle) {
        this.setError('handle');
      }
      if (!this.password) {
        this.setError('password');
      }
      if (this.instance && this.handle && this.password) {
        this.config.resolve({
          instance: this.instance,
          handle: this.handle,
          password: this.password,
        })
      }
    },
  },
});
</script>
