import type {
  AppApprovalMethod,
  Resource,
} from '@igstack/app-catalog-backend-core'
import { ArrowLeft } from 'lucide-react'
import { Button } from '~/ui/button'
import { Badge } from '~/ui/badge'
import { AccessRequestSection } from './AccessRequestSection'

interface SubResourceDetailPanelProps {
  subResource: Resource
  parent: Resource
  approvalMethods: AppApprovalMethod[]
  onBack: () => void
}

function StepBadge({ step }: { step: number }) {
  return (
    <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
      {step}
    </span>
  )
}

export function SubResourceDetailPanel({
  subResource,
  parent,
  approvalMethods,
  onBack,
}: SubResourceDetailPanelProps) {
  const hasParentAccess = !!parent.accessRequest
  const hasSubAccess = !!subResource.accessRequest
  const hasTwoStepAccess = hasParentAccess && hasSubAccess
  const hasAnyAccess = hasParentAccess || hasSubAccess

  return (
    <div className="flex h-full flex-col p-6">
      {/* Back navigation */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
          aria-label={`Back to ${parent.displayName}`}
        >
          <ArrowLeft className="size-4" />
          <span>{parent.displayName}</span>
        </Button>
      </div>

      {/* Sub-resource title */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-semibold">{subResource.displayName}</h2>
          {subResource.tier && (
            <Badge variant="outline" className="text-xs">
              {subResource.tier}
            </Badge>
          )}
        </div>
        {subResource.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {subResource.description}
          </p>
        )}
        {(subResource.aliases ?? []).length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Also known as: {(subResource.aliases ?? []).join(', ')}
          </p>
        )}
      </div>

      {/* Two-step access section */}
      {hasAnyAccess && (
        <div className="mt-6 space-y-6">
          <h3 className="text-sm font-medium">How to get access</h3>

          {hasTwoStepAccess ? (
            <>
              {/* Step 1: Parent access */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StepBadge step={1} />
                  <span className="text-sm font-medium text-muted-foreground">
                    {parent.displayName}
                  </span>
                </div>
                <div className="pl-8">
                  <AccessRequestSection
                    app={parent}
                    approvalMethods={approvalMethods}
                  />
                </div>
              </div>

              {/* Step 2: Sub-resource access */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StepBadge step={2} />
                  <span className="text-sm font-medium text-muted-foreground">
                    {subResource.displayName}
                  </span>
                </div>
                <div className="pl-8">
                  <AccessRequestSection
                    app={subResource}
                    approvalMethods={approvalMethods}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Single-step: only one of them has access info */
            <AccessRequestSection
              app={hasParentAccess ? parent : subResource}
              approvalMethods={approvalMethods}
            />
          )}
        </div>
      )}
    </div>
  )
}
