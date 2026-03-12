/**
 * 【内容管理区】工具栏模块
 * 负责搜索、分页按钮、滚动、实时刷新等工具栏交互
 */
window.LogViewerToolbar = (function() {
    'use strict';

    let refreshTimer = null;

    /**
     * 统一的分页按钮处理
     */
    async function handlePaginationClick(action, appContext) {
        if (!appContext.getActiveId()) return;
        
        const currentPage = window.LogViewerPagination.getCurrentPage();
        const totalPages = window.LogViewerPagination.getTotalPages();
        let targetPage = currentPage;
        
        switch (action) {
            case 'first':
                if (currentPage <= 1) return;
                targetPage = 1;
                break;
            case 'prev':
                if (currentPage <= 1) return;
                targetPage = currentPage - 1;
                break;
            case 'next':
                if (currentPage >= totalPages) return;
                targetPage = currentPage + 1;
                break;
            case 'last':
                if (currentPage >= totalPages) return;
                targetPage = totalPages;
                break;
            default:
                return;
        }
        
        if (appContext.isPaginationMode()) {
            await appContext.loadPage(targetPage);
            window.LogViewerContentRenderer.showPageIndicator(targetPage);
        } else {
            const newPage = window.LogViewerPagination.goToPage(targetPage);
            window.LogViewerContentRenderer.renderLogContent(appContext.getContentLines(), null, newPage);
            window.LogViewerPagination.updatePagination(appContext.getContentLines().length);
            window.LogViewerContentRenderer.showPageIndicator(newPage);
        }
    }

    /**
     * 统一的滚动处理
     */
    async function handleScrollAction(action, appContext) {
        if (!appContext.getActiveId()) return;
        
        const currentPage = window.LogViewerPagination.getCurrentPage();
        const totalPages = window.LogViewerPagination.getTotalPages();
        
        if (action === 'top') {
            if (appContext.isPaginationMode()) {
                if (currentPage !== 1) {
                    await appContext.loadPage(1);
                }
                window.LogViewerContentRenderer.scrollToTop();
            } else {
                if (currentPage !== 1) {
                    const newPage = window.LogViewerPagination.goToPage(1);
                    window.LogViewerContentRenderer.renderLogContent(appContext.getContentLines(), null, newPage);
                    window.LogViewerPagination.updatePagination(appContext.getContentLines().length);
                }
                window.LogViewerContentRenderer.scrollToTop();
            }
        } else if (action === 'bottom') {
            if (appContext.isPaginationMode()) {
                if (currentPage !== totalPages) {
                    await appContext.loadPage(totalPages);
                }
                window.LogViewerContentRenderer.scrollToBottom();
            } else {
                if (currentPage !== totalPages) {
                    const newPage = window.LogViewerPagination.goToPage(totalPages);
                    window.LogViewerContentRenderer.renderLogContent(appContext.getContentLines(), null, newPage);
                    window.LogViewerPagination.updatePagination(appContext.getContentLines().length);
                }
                window.LogViewerContentRenderer.scrollToBottom();
            }
        }
    }

    /**
     * 执行内容搜索
     */
    async function performContentSearch(openPanel, appContext) {
        const keyword = $("#content-search").val().trim();
        const useRegex = $("#use-regex").is(":checked");
        
        if (!appContext.getActiveId() || !keyword) {
            window.LogViewerSearch.clearSearchResults();
            if (!appContext.isPaginationMode()) {
                window.LogViewerContentRenderer.renderLogContent(appContext.getContentLines(), null, window.LogViewerPagination.getCurrentPage());
            }
            return;
        }

        try {
            if (openPanel !== false) {
                window.LogViewerUIState.openSearchPanel();
                $("#search-results-list").html(`
                    <div class="text-center p-3">
                        <div class="loading-spinner" style="width: 24px; height: 24px; margin: 0 auto 8px;"></div>
                        <div>搜索中...</div>
                    </div>
                `);
            }
            
            const response = await fetch(`${window.LogViewerUtils.getEndpoint()}/file/search/advanced`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file: appContext.getActiveId(),
                    keyword: keyword,
                    useRegex: useRegex,
                    caseSensitive: false,
                    contextLines: 0,
                    maxResults: 10000
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error || '搜索失败');
            
            window.LogViewerSearch.setServerSearchResults(result, appContext.isPaginationMode());
            window.LogViewerSearch.renderSearchResults(keyword, useRegex);
            
            if (openPanel !== false) {
                window.LogViewerUIState.openSearchPanel();
            }
            
            return result;
            
        } catch (error) {
            console.error('搜索失败:', error);
            $("#search-results-list").html(`
                <div class="text-center text-danger p-3">
                    <div>搜索失败</div>
                    <div style="font-size: 12px; margin-top: 8px;">${error.message}</div>
                </div>
            `);
            throw error;
        }
    }

    /**
     * 启动/停止实时刷新
     */
    async function toggleAutoRefresh(appContext) {
        const $btn = $("#refresh-btn");

        if ($btn.prop("disabled") || $btn.hasClass("disabled")) return;

        const $icon = $btn.find('.refresh-btn-icon');
        const $text = $btn.find('.refresh-btn-text');
        const $loading = $btn.find('.refresh-btn-loading');
        
        if (refreshTimer) {
            // 停止刷新
            clearInterval(refreshTimer);
            refreshTimer = null;
            
            $btn.removeClass("refreshing");
            $icon.show();
            $text.text("实时刷新");
            $loading.hide();

            window.LogViewerPagination.setAutoRefreshEnabled(false);
            window.LogViewerPagination.updatePagination(window.LogViewerPagination.getTotalPages() * 1000);
            $("#scroll-top-btn, #scroll-bottom-btn, #page-jump-input").prop("disabled", false).css("cursor", "").removeClass("disabled");
            return;
        }

        if (!appContext.getActiveId()) {
            alert('请先选择一个文件');
            return;
        }

        try {
            if (appContext.isPaginationMode()) {
                const metadata = window.LogViewerPageCache.getStatus().metadata;
                const lastPage = metadata.totalPages;
                await appContext.loadPage(lastPage, true);
            } else {
                const totalPages = window.LogViewerPagination.getTotalPages();
                window.LogViewerPagination.setCurrentPage(totalPages);
                window.LogViewerContentRenderer.renderLogContent(appContext.getContentLines(), null, totalPages);
                window.LogViewerPagination.updatePagination(appContext.getContentLines().length);
                window.LogViewerContentRenderer.scrollToBottom();
            }

            $btn.addClass("refreshing");
            $icon.hide();
            $text.text("停止刷新");
            $loading.show();

            window.LogViewerPagination.setAutoRefreshEnabled(true);
            window.LogViewerPagination.updatePagination(window.LogViewerPagination.getTotalPages() * 1000);
            $("#scroll-top-btn, #scroll-bottom-btn, #page-jump-input").prop("disabled", true).css("cursor", "not-allowed").addClass("disabled");

            refreshTimer = setInterval(async function () {
                if (!appContext.getActiveId()) {
                    console.warn('文件ID丢失，停止刷新');
                    $btn.trigger('click');
                    return;
                }

                if (appContext.isPaginationMode()) {
                    try {
                        const metadata = window.LogViewerPageCache.getStatus().metadata;
                        const lastPage = metadata.totalPages;
                        await appContext.loadPage(lastPage, true);
                    } catch (error) {
                        console.error('[Refresh] 刷新跳转失败:', error);
                    }
                } else {
                    const loadCallback = function(newLines) {
                        try {
                            appContext.setContentLines(newLines);
                            window.LogViewerPagination.updatePagination(newLines.length);
                            const newTotalPages = window.LogViewerPagination.getTotalPages();
                            window.LogViewerPagination.setCurrentPage(newTotalPages);
                            window.LogViewerContentRenderer.renderLogContent(newLines, null, newTotalPages);
                            window.LogViewerContentRenderer.scrollToBottom();
                        } catch (error) {
                            console.error('刷新回调处理失败:', error);
                        }
                    };
                    
                    const errorCallback = function(error) {
                        console.error('刷新加载失败:', error);
                    };
                    
                    const activeId = appContext.getActiveId();
                    if (activeId.includes("!")) {
                        const idx = activeId.indexOf("!");
                        window.LogViewerFileOperations.loadZipEntry(activeId.substring(0, idx), activeId.substring(idx + 1), loadCallback, errorCallback);
                    } else {
                        window.LogViewerFileOperations.loadFsFile(activeId, loadCallback, errorCallback);
                    }
                }
            }, 500);
            
        } catch (error) {
            console.error('启动实时刷新失败:', error);
            alert('启动实时刷新失败: ' + error.message);
        }
    }

    /**
     * 停止刷新（外部调用）
     */
    function stopRefresh() {
        if (refreshTimer) {
            $("#refresh-btn").trigger('click');
        }
    }

    /**
     * 是否正在刷新
     */
    function isRefreshing() {
        return refreshTimer !== null;
    }

    /**
     * 清理资源
     */
    function cleanup() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    return {
        handlePaginationClick,
        handleScrollAction,
        performContentSearch,
        toggleAutoRefresh,
        stopRefresh,
        isRefreshing,
        cleanup
    };
})();
