import type { MockService } from '../mock-backend/MockService'
import { MockFeedbackStore } from './MockFeedbackStore'
import { NetworkCatalog } from './NetworkCatalog'
import { SharedNetwork } from './SharedNetwork'

export function makeNetworkReplyWithCatalog(
  service: MockService,
): NetworkCatalog {
  const catalog = new NetworkCatalog()
  // One store behind every feedback route, so reading reflects writing.
  const feedback = new MockFeedbackStore()

  catalog.add(SharedNetwork.appCatalogQuery(service))
  catalog.add(SharedNetwork.feedbackList(feedback))
  catalog.add(SharedNetwork.feedbackMine(feedback))
  catalog.add(SharedNetwork.feedbackAdd(feedback))
  catalog.add(SharedNetwork.feedbackEdit(feedback))
  catalog.add(SharedNetwork.feedbackDismiss(feedback))
  catalog.add(SharedNetwork.feedbackAttachmentUpload(feedback))
  catalog.add(SharedNetwork.feedbackAttachmentBinary())
  catalog.add(SharedNetwork.authGetSession(service))
  catalog.add(SharedNetwork.authGetProviders())
  catalog.add(SharedNetwork.authSignOut())
  catalog.add(SharedNetwork.authDevLogout())
  catalog.add(SharedNetwork.screenshotBinary())
  catalog.add(SharedNetwork.iconBinary())
  catalog.add(SharedNetwork.communityToolsConfig(service))
  catalog.add(SharedNetwork.communityToolsList(service))
  catalog.add(SharedNetwork.communityToolsGet(service))
  catalog.add(SharedNetwork.communityToolsRecordView(service))
  catalog.add(SharedNetwork.communityToolsRecent(service))
  catalog.add(SharedNetwork.communityToolsPins(service))
  catalog.add(SharedNetwork.communityToolsPin(service))
  catalog.add(SharedNetwork.communityToolsUnpin(service))
  catalog.add(SharedNetwork.communityToolsReorderPins(service))
  catalog.add(SharedNetwork.communityToolsPreview(service))
  catalog.add(SharedNetwork.communityToolsAdd(service))
  catalog.add(SharedNetwork.communityToolsEdit(service))
  catalog.add(SharedNetwork.communityToolsArchive(service))
  catalog.add(SharedNetwork.communityToolsApprove(service))

  return catalog
}
