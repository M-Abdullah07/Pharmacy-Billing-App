import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer - A consistent wrapper for all pages in the app
 * Provides unified spacing, background, and layout structure
 */
export function PageContainer({
    children,
    className,
    title,
    description,
    actions,
    noPadding = false
}) {
    return (
        <div className={cn(
            "flex flex-col h-full w-full overflow-auto",
            "bg-background",
            className
        )}>
            {/* Page Header */}
            {(title || description || actions) && (
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <div className="flex items-center justify-between p-6">
                        <div className="space-y-1">
                            {title && (
                                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                            )}
                            {description && (
                                <p className="text-muted-foreground">{description}</p>
                            )}
                        </div>
                        {actions && (
                            <div className="flex items-center gap-2">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Page Content */}
            <div className={cn(
                "flex-1",
                !noPadding && "p-6",
                "space-y-6"
            )}>
                {children}
            </div>
        </div>
    );
}

/**
 * PageSection - A consistent section wrapper within pages
 * Provides unified card-like styling
 */
export function PageSection({
    children,
    className,
    title,
    description,
    actions,
    noPadding = false
}) {
    return (
        <div className={cn(
            "rounded-lg border bg-card text-card-foreground shadow-sm",
            className
        )}>
            {(title || description || actions) && (
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="space-y-1">
                        {title && (
                            <h3 className="text-xl font-semibold leading-none tracking-tight">{title}</h3>
                        )}
                        {description && (
                            <p className="text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex items-center gap-2">
                            {actions}
                        </div>
                    )}
                </div>
            )}

            <div className={cn(
                !noPadding && "p-6"
            )}>
                {children}
            </div>
        </div>
    );
}

/**
 * EmptyState - Consistent empty state component
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            {Icon && (
                <div className="mb-4 rounded-full bg-muted p-4">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
            )}
            {title && (
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            )}
            {description && (
                <p className="mb-4 text-sm text-muted-foreground max-w-sm">{description}</p>
            )}
            {action}
        </div>
    );
}

/**
 * LoadingState - Consistent loading component
 */
export function LoadingState({ message = "Loading..." }) {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mb-4" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

/**
 * ErrorState - Consistent error component
 */
export function ErrorState({
    title = "Something went wrong",
    message,
    action
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-destructive/10 p-4">
                <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            {message && (
                <p className="mb-4 text-sm text-muted-foreground max-w-sm">{message}</p>
            )}
            {action}
        </div>
    );
}

/**
 * MessageAlert - Consistent message/notification component
 */
export function MessageAlert({ type = "info", message, onDismiss }) {
    const styles = {
        success: "bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800",
        error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800",
        warning: "bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-100 dark:border-yellow-800",
        info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-800"
    };

    return (
        <div className={cn(
            "relative rounded-lg border p-4",
            styles[type]
        )}>
            <div className="flex items-start gap-3">
                <div className="flex-1 text-sm font-medium">
                    {message}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-current opacity-70 hover:opacity-100 transition-opacity"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
