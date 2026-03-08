export interface AcBackendUiDefaultsInput {
  credentialsRefs: Array<string>
}

export interface AcBackendCredentialInput {
  slug: string
  desc?: string
  username: string
  password: string
}
