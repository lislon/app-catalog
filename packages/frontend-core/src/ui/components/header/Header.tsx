import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import React, { use } from 'react'
import AppCatalogLogo from '~/assets/app-catalog.svg?react'
import { useTRPC } from '~/api/infra/trpc'
import { ThemeSwitcher } from '~/components/ThemeSwitcher'
import { AppCatalogContext } from '~/modules/appCatalog/context/AppCatalogContext'
import {
  useAuth,
  useAuthActions,
  useIsAuthenticated,
  useUser,
} from '~/modules/auth'
import { useAuthModal } from '~/modules/auth/AuthModalContext'
import { Button } from '~/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/ui/dropdown-menu'
import { Skeleton } from '~/ui/skeleton'

export interface HeaderProps {
  middle?: React.ReactNode
}

export function Header({ middle }: HeaderProps) {
  const { isLoading } = useAuth()
  const isAuthenticated = useIsAuthenticated()
  const user = useUser()
  const { logout, devLogin } = useAuthActions()
  const { open: openLoginModal } = useAuthModal()
  const appCatalogContextMaybe = use(AppCatalogContext)
  const trpc = useTRPC()
  const { data: providersData } = useQuery(
    trpc.auth.getProviders.queryOptions(),
  )

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleLoginClick = () => {
    // Preserve the current URL for redirect after login
    const currentUrl = window.location.pathname + window.location.search
    openLoginModal(currentUrl)
  }

  return (
    <div className="flex items-center mb-4 pb-4 gap-4 border-b">
      <div className="flex items-center gap-4">
        <Link to="/">
          <div className="flex items-center gap-2">
            <AppCatalogLogo className="h-16 w-16" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">App Catalog</span>
              {appCatalogContextMaybe?.versions && (
                <div className="flex flex-col gap-0.5">
                  {appCatalogContextMaybe.versions.backend &&
                    (appCatalogContextMaybe.versions.backend.url ? (
                      <a
                        href={appCatalogContextMaybe.versions.backend.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                        onClick={(e) => e.stopPropagation()}
                        title="Backend Version"
                      >
                        BE:{' '}
                        {appCatalogContextMaybe.versions.backend.displayName}
                      </a>
                    ) : (
                      <span
                        className="text-xs text-muted-foreground"
                        title="Backend Version"
                      >
                        BE:{' '}
                        {appCatalogContextMaybe.versions.backend.displayName}
                      </span>
                    ))}
                  {appCatalogContextMaybe.versions.frontend && (
                    <span
                      className="text-xs text-muted-foreground"
                      title="Frontend Version"
                    >
                      FE: {appCatalogContextMaybe.versions.frontend.displayName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
      {middle && <div className="flex-1">{middle}</div>}
      <div className="flex items-center gap-3 ml-auto">
        <ThemeSwitcher />
        {isLoading ? (
          <Skeleton className="w-8 h-8 rounded-full" />
        ) : !isAuthenticated ? (
          <div className="flex items-center gap-2">
            {providersData?.devLoginEnabled && (
              <button
                type="button"
                onClick={devLogin}
                className="text-xs font-medium px-2 py-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer"
              >
                DEV Login
              </button>
            )}
            <button
              type="button"
              onClick={handleLoginClick}
              className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Login
            </button>
          </div>
        ) : user?.name ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 rounded-full p-0 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                aria-label={`User menu for ${user.name}`}
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-3 flex items-center gap-3">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.email?.split('@')[0] || 'user'}
                  </p>
                  <p className="text-sm font-medium truncate">{user.name}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  )
}
