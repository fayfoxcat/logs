/**
 * 【日志区】内容渲染模块
 */
window.LogViewerContentRenderer = (function() {
    'use strict';

    const LINES_PER_PAGE = 1000;
    let currentLines = [];
    let currentHighlightMap = null;
    let currentPage = 1;
    let totalPages = 1;
    let pageIndicatorTimer = null;

    function showLoading() {
        $("#log-content-empty").hide();
        const $actual = $("#log-content-actual");
        $actual.show().html('');
        const $loading = $actual.find("#loading-overlay");
        if ($loading.length === 0) {
            $actual.append(`
                <div id="loading-overlay" class="loading-overlay" style="display: flex;">
                    <div class="loading-content">
                        <div class="loading-spinner large">
                            <svg class="loading-circle" viewBox="0 0 50 50">
                                <circle class="loading-path" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                            </svg>
                        </div>
                        <div class="loading-text">加载中...</div>
                    </div>
                </div>
            `);
        } else {
            $loading.show();
        }
    }

    function hideLoading() {
        $("#log-content-actual").find("#loading-overlay").remove();
    }

    function renderLogContent(lines, highlightInfo, page, startLineNumber) {
        currentLines = lines;
        currentHighlightMap = highlightInfo;
        currentPage = page || 1;
        totalPages = Math.max(1, Math.ceil(lines.length / LINES_PER_PAGE));
        
        renderPageContent(page, startLineNumber);
        hideLoading();
    }

    function renderPageContent(page, startLineNumber) {
        const startLine = (page - 1) * LINES_PER_PAGE + 1;
        const endLine = Math.min(startLine + LINES_PER_PAGE - 1, currentLines.length);
        
        const map = currentHighlightMap || new Map();
        let html = `<div class="log-lines">`;
        
        for (let i = startLine - 1; i < endLine && i < currentLines.length; i++) {
            const ln = startLineNumber ? (startLineNumber + i) : (i + 1);
            const raw = currentLines[i] ?? "";
            const ranges = map.get(ln) || [];
            
            let textHtml;
            if (ranges.length && window.LogHighlighter) {
                textHtml = applySyntaxAndSearchHighlight(raw, ranges);
            } else if (window.LogHighlighter) {
                textHtml = window.LogHighlighter.highlightLine(raw);
            } else {
                textHtml = ranges.length ? applyRangesToText(raw, ranges) : window.LogViewerUtils.escapeHtml(raw);
            }
            
            html += `
              <div class="log-line" data-line="${ln}">
                <span class="log-ln">${ln}</span>
                <span class="log-txt">${textHtml}</span>
              </div>
            `;
        }
        html += `</div>`;
        
        $("#log-content-actual").html(html);
    }

    function applySyntaxAndSearchHighlight(text, searchRanges) {
        const syntaxHtml = window.LogHighlighter.highlightLine(text);
        const $temp = $('<div>').html(syntaxHtml);
        
        searchRanges.forEach(range => {
            highlightRangeInDom($temp[0], range.s, range.e);
        });
        
        return $temp.html();
    }

    function highlightRangeInDom(container, start, end) {
        let charCount = 0;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const nodesToHighlight = [];
        let node;
        
        while (node = walker.nextNode()) {
            const nodeStart = charCount;
            const nodeEnd = charCount + node.textContent.length;
            
            if (nodeEnd > start && nodeStart < end) {
                const highlightStart = Math.max(0, start - nodeStart);
                const highlightEnd = Math.min(node.textContent.length, end - nodeStart);
                
                nodesToHighlight.push({
                    node: node,
                    start: highlightStart,
                    end: highlightEnd
                });
            }
            
            charCount = nodeEnd;
            if (charCount >= end) break;
        }
        
        nodesToHighlight.reverse().forEach(item => {
            const text = item.node.textContent;
            const before = text.substring(0, item.start);
            const highlight = text.substring(item.start, item.end);
            const after = text.substring(item.end);
            
            const fragment = document.createDocumentFragment();
            if (before) fragment.appendChild(document.createTextNode(before));
            
            const mark = document.createElement('mark');
            mark.className = 'log-hit';
            mark.textContent = highlight;
            fragment.appendChild(mark);
            
            if (after) fragment.appendChild(document.createTextNode(after));
            
            item.node.parentNode.replaceChild(fragment, item.node);
        });
    }

    function applyRangesToText(text, ranges) {
        const t = String(text ?? "");
        const sorted = ranges.slice().sort((a, b) => a.s - b.s);
        let out = "";
        let pos = 0;
        for (const r of sorted) {
            const s = Math.max(0, Math.min(t.length, r.s));
            const e = Math.max(0, Math.min(t.length, r.e));
            if (e <= s) continue;
            if (s > pos) out += window.LogViewerUtils.escapeHtml(t.slice(pos, s));
            out += `<mark class="log-hit">${window.LogViewerUtils.escapeHtml(t.slice(s, e))}</mark>`;
            pos = e;
        }
        if (pos < t.length) out += window.LogViewerUtils.escapeHtml(t.slice(pos));
        return out;
    }

    function scrollToLine(lineNumber) {
        const $container = $("#log-content-actual");
        const $line = $container.find(`.log-line[data-line='${lineNumber}']`).first();
        if ($line.length === 0) return;
        const containerHeight = $container.height();
        const targetOffset = containerHeight / 5;
        const top = $line.position().top + $container.scrollTop() - targetOffset;
        $container.stop(true).animate({ scrollTop: Math.max(0, top) }, 150);
    }

    function scrollToTop() {
        const $container = $("#log-content-actual");
        $container.stop(true).animate({ scrollTop: 0 }, 150);
    }

    function scrollToBottom(immediate = false) {
        const $container = $("#log-content-actual");
        const el = $container[0];
        if (!el) return;
        
        if (immediate) {
            const lastLine = el.querySelector('.log-lines > .log-line:last-child');
            if (lastLine) {
                lastLine.scrollIntoView({ block: 'end', behavior: 'instant' });
            } else {
                el.scrollTop = 999999999;
            }
        } else {
            $container.stop(true).animate({ scrollTop: el.scrollHeight }, 150);
        }
    }

    function scrollToPosition(position) {
        const $container = $("#log-content-actual");
        const container = $container[0];
        if (!container) return;
        
        setTimeout(() => {
            if (position === 'top') {
                $container.scrollTop(0);
            } else if (position === 'bottom') {
                $container.scrollTop(container.scrollHeight);
            }
        }, 50);
    }

    function showPageIndicator(page) {
        const $indicator = $("#page-indicator");
        const $text = $("#page-indicator-text");
        
        if (pageIndicatorTimer) {
            clearTimeout(pageIndicatorTimer);
        }
        
        $text.text(`第 ${page} 页`);
        $indicator.removeClass('hide').addClass('show').show();
        
        pageIndicatorTimer = setTimeout(() => {
            $indicator.removeClass('show').addClass('hide');
            setTimeout(() => {
                $indicator.hide();
            }, 200);
        }, 500);
    }

    function jumpToPage(page) {
        currentPage = Math.max(1, Math.min(totalPages, page));
        renderPageContent(currentPage);
        
        window.LogViewerPagination.setCurrentPage(currentPage);
        window.LogViewerPagination.updatePagination(currentLines.length);
        
        showPageIndicator(currentPage);
        
        setTimeout(() => {
            $("#log-content-actual").scrollTop(0);
        }, 50);
    }

    return {
        renderLogContent,
        scrollToLine,
        scrollToTop,
        scrollToBottom,
        scrollToPosition,
        jumpToPage,
        showPageIndicator,
        showLoading,
        hideLoading,
        LINES_PER_PAGE
    };
})();
