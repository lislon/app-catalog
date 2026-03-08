export interface AcStaticControllerContract {
  methods: {
    getIcon: { method: string; url: string }
    getScreenshot: { method: string; url: string }
  }
}

export const staticControllerContract: AcStaticControllerContract = {
  methods: {
    getIcon: {
      method: 'get',
      url: 'icon/:icon',
    },
    getScreenshot: {
      method: 'get',
      url: 'screenshot/:id',
    },
  },
}
