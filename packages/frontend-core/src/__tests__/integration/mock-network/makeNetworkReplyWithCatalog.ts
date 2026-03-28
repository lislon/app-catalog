import type { MockService } from '../mock-backend/MockService'
import { NetworkCatalog } from './NetworkCatalog'
import { SharedNetwork } from './SharedNetwork'

export function makeNetworkReplyWithCatalog(
  service: MockService,
): NetworkCatalog {
  const catalog = new NetworkCatalog()

  catalog.add(SharedNetwork.appCatalogQuery(service))
  catalog.add(SharedNetwork.authGetSession(service))
  catalog.add(SharedNetwork.screenshotBinary())
  catalog.add(SharedNetwork.iconBinary())

  return catalog
}
