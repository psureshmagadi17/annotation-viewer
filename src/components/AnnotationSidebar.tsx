import React, { useState, useMemo } from 'react'
import { usePdfStore } from '@/stores/pdfStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  FileText,
  Hash,
  PlusCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Annotation } from '@/types'

interface AnnotationSidebarProps {
  className?: string
}

const FEEDBACK_TYPE_ICONS = {
  true_positive: CheckCircle,
  false_positive: XCircle,
  false_negative: AlertCircle,
  unreviewed: HelpCircle,
}

const FEEDBACK_TYPE_COLORS = {
  true_positive: 'text-green-600',
  false_positive: 'text-red-600',
  false_negative: 'text-orange-600',
  unreviewed: 'text-gray-500',
}

const FEEDBACK_TYPE_LABELS = {
  true_positive: 'Correct',
  false_positive: 'Incorrect',
  false_negative: 'Missing',
  unreviewed: 'Unreviewed',
}

export const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({ className }) => {
  const {
    annotations,
    viewerState,
    selectAnnotation,
    updateViewerState,
  } = usePdfStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set())
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Get unique entity types from annotations
  const entityTypes = useMemo(() => {
    const types = Array.from(new Set(annotations.map(a => a.entity_type)))
    return types.sort()
  }, [annotations])

  // Separate extracted and user-created annotations
  const extractedAnnotations = useMemo(() => {
    return annotations.filter(a => !a.is_user_created)
  }, [annotations])

  const userCreatedAnnotations = useMemo(() => {
    return annotations.filter(a => a.is_user_created)
  }, [annotations])

  // Filter and group extracted annotations
  const filteredExtractedAnnotations = useMemo(() => {
    return extractedAnnotations.filter(annotation => {
      const matchesSearch = annotation.span_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           annotation.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesEntityType = entityTypeFilter === 'all' || annotation.entity_type === entityTypeFilter
      
      const matchesStatus = statusFilter === 'all' || annotation.feedback_type === statusFilter

      return matchesSearch && matchesEntityType && matchesStatus
    })
  }, [extractedAnnotations, searchTerm, entityTypeFilter, statusFilter])

  // Filter user-created annotations (always show false negatives)
  const filteredUserCreatedAnnotations = useMemo(() => {
    return userCreatedAnnotations.filter(annotation => {
      const matchesSearch = annotation.span_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           annotation.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesEntityType = entityTypeFilter === 'all' || annotation.entity_type === entityTypeFilter

      return matchesSearch && matchesEntityType
    })
  }, [userCreatedAnnotations, searchTerm, entityTypeFilter])

  // Group filtered extracted annotations by page
  const extractedAnnotationsByPage = useMemo(() => {
    return filteredExtractedAnnotations.reduce((acc, annotation) => {
      if (!acc[annotation.page]) {
        acc[annotation.page] = []
      }
      acc[annotation.page].push(annotation)
      return acc
    }, {} as Record<number, Annotation[]>)
  }, [filteredExtractedAnnotations])

  // Group filtered user-created annotations by page
  const userCreatedAnnotationsByPage = useMemo(() => {
    return filteredUserCreatedAnnotations.reduce((acc, annotation) => {
      if (!acc[annotation.page]) {
        acc[annotation.page] = []
      }
      acc[annotation.page].push(annotation)
      return acc
    }, {} as Record<number, Annotation[]>)
  }, [filteredUserCreatedAnnotations])

  // Auto-expand current page and pages with annotations
  React.useEffect(() => {
    const pagesToExpand = new Set([viewerState.current_page])
    Object.keys(extractedAnnotationsByPage).forEach(page => {
      pagesToExpand.add(parseInt(page))
    })
    Object.keys(userCreatedAnnotationsByPage).forEach(page => {
      pagesToExpand.add(parseInt(page))
    })
    setExpandedPages(pagesToExpand)
  }, [viewerState.current_page, extractedAnnotationsByPage, userCreatedAnnotationsByPage])

  const handleTogglePage = (pageNumber: number) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(pageNumber)) {
        newSet.delete(pageNumber)
      } else {
        newSet.add(pageNumber)
      }
      return newSet
    })
  }

  const handleAnnotationClick = (annotation: Annotation) => {
    selectAnnotation(annotation.annotation_id)
  }

  const handlePageClick = (pageNumber: number) => {
    updateViewerState({ current_page: pageNumber })
  }

  const isPageExpanded = (pageNumber: number) => expandedPages.has(pageNumber)
  const isCurrentPage = (pageNumber: number) => pageNumber === viewerState.current_page
  const isCurrentAnnotation = (annotationId: string) => annotationId === viewerState.current_annotation_id

  // Render annotation list component
  const renderAnnotationList = (
    annotationsByPage: Record<number, Annotation[]>,
    isUserCreated: boolean = false
  ) => {
    const sortedPages = Object.keys(annotationsByPage)
      .map(Number)
      .sort((a, b) => a - b)

    if (sortedPages.length === 0) {
      return null
    }

    return (
      <div className="space-y-1">
        {sortedPages.map(pageNumber => {
          const pageAnnotations = annotationsByPage[pageNumber]
          const isExpanded = isPageExpanded(pageNumber)
          const isCurrent = isCurrentPage(pageNumber)

          return (
            <div key={`${isUserCreated ? 'user-' : ''}${pageNumber}`} className="border border-border rounded-md">
              {/* Page Header */}
              <button
                onClick={() => handleTogglePage(pageNumber)}
                className={cn(
                  "w-full flex items-center justify-between p-3 text-left hover:bg-accent/50 transition-colors",
                  isCurrent && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Page {pageNumber}</span>
                  <span className="text-sm text-muted-foreground">
                    ({pageAnnotations.length} annotation{pageAnnotations.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePageClick(pageNumber)
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Go
                </Button>
              </button>

              {/* Page Annotations */}
              {isExpanded && (
                <div className="border-t border-border">
                  {pageAnnotations.map((annotation) => {
                    const StatusIcon = FEEDBACK_TYPE_ICONS[annotation.feedback_type]
                    const statusColor = FEEDBACK_TYPE_COLORS[annotation.feedback_type]
                    const statusLabel = FEEDBACK_TYPE_LABELS[annotation.feedback_type]
                    const isCurrent = isCurrentAnnotation(annotation.annotation_id)

                    return (
                      <button
                        key={annotation.annotation_id}
                        onClick={() => handleAnnotationClick(annotation)}
                        className={cn(
                          "w-full p-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0",
                          isCurrent && "bg-accent",
                          isUserCreated && "bg-orange-50/50"
                        )}
                      >
                        <div className="space-y-2">
                          {/* Header with annotation title and status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isUserCreated && (
                                <PlusCircle className="w-3 h-3 text-orange-600" />
                              )}
                              <span className="text-sm font-medium text-primary">
                                {annotation.annotation_title || annotation.entity_type}
                              </span>
                            </div>
                            <div className={cn("flex items-center gap-1", statusColor)}>
                              <StatusIcon className="w-4 h-4" />
                              <span className="text-xs">{statusLabel}</span>
                            </div>
                          </div>

                          {/* Annotation text */}
                          <div className="text-sm text-foreground">
                            {annotation.span_text}
                          </div>

                          {/* Notes if available */}
                          {annotation.notes && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              {annotation.notes}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("w-80 bg-card border-r border-border flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Annotations
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search annotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Entity Type
              </label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              >
                <option value="all">All Types</option>
                {entityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              >
                <option value="all">All Statuses</option>
                <option value="unreviewed">Unreviewed</option>
                <option value="true_positive">Correct</option>
                <option value="false_positive">Incorrect</option>
                <option value="false_negative">Missing</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Annotation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {extractedAnnotationsByPage && Object.keys(extractedAnnotationsByPage).length === 0 && 
           userCreatedAnnotationsByPage && Object.keys(userCreatedAnnotationsByPage).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No annotations found</p>
              {searchTerm || entityTypeFilter !== 'all' || statusFilter !== 'all' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setEntityTypeFilter('all')
                    setStatusFilter('all')
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Extracted Annotations Section */}
              {extractedAnnotationsByPage && Object.keys(extractedAnnotationsByPage).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 px-2">Extracted Annotations</h3>
                  {renderAnnotationList(extractedAnnotationsByPage, false)}
                </div>
              )}

              {/* Missing Annotations Section */}
              {userCreatedAnnotationsByPage && Object.keys(userCreatedAnnotationsByPage).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 px-2 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-orange-600" />
                    Missing Annotations
                    <span className="text-xs text-muted-foreground font-normal">
                      ({filteredUserCreatedAnnotations.length})
                    </span>
                  </h3>
                  {renderAnnotationList(userCreatedAnnotationsByPage, true)}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with summary */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="text-xs text-muted-foreground text-center">
          {filteredExtractedAnnotations.length + filteredUserCreatedAnnotations.length} of {annotations.length} annotations
          {filteredUserCreatedAnnotations.length > 0 && (
            <span className="block mt-1">
              {filteredUserCreatedAnnotations.length} missing annotation{filteredUserCreatedAnnotations.length !== 1 ? 's' : ''}
            </span>
          )}
          {searchTerm || entityTypeFilter !== 'all' || statusFilter !== 'all' ? (
            <span className="block mt-1">Filtered results</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
