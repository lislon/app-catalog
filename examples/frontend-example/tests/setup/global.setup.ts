import { startStubServer } from '../stub-server'

const BACKEND_PORT = 4500

export default async function globalSetup() {
  await startStubServer(BACKEND_PORT)
}
