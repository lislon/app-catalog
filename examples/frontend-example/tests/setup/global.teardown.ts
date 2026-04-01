import { stopStubServer } from '../stub-server'

export default async function globalTeardown() {
  await stopStubServer()
}
