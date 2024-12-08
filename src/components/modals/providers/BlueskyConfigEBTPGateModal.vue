<template>
    <modal-inner aria-label="Custom EBTP Gate">
      <div class="modal__content">
        <div class="modal__image">
          <icon-provider provider-id="bluesky"></icon-provider>
        </div>
        <form-entry label="Service URL" error="service">
          <input slot="field" class="textfield" type="text" v-model.trim="service" @keydown.enter="resolve()">
          <div class="form-entry__info">
            <b>Example:</b> https://ebtp.hukoubook.com/go?u=${postAt}<br>
            <b>You can use these variable names:</b> postAt/did/handle/rkey
          </div>
        </form-entry>
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
  import badgeSvc from '../../../services/badgeSvc';
  
  export default modalTemplate({
    data: () => ({
      service: '',
    }),
    computedLocalSettings: {
    },
    async created() {
      let service = await blueskyProvider.currentEBTPGate(this.config.token)
      if (service) this.service = service
    },
    methods: {
      async resolve() {
        if (!this.service) {
          this.setError('service');
        }
        if (this.service) {
          await blueskyProvider.configEBTPGate(
            this.config.token,
            this.service
          );
          badgeSvc.addBadge('configEBTPGate');
          this.config.resolve({});
        }
      },
    },
  });
  </script>
  