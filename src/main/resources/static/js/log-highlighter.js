/**
 * 简单的日志语法高亮器
 * 不依赖任何外部库，纯 JavaScript 实现
 */
(function() {
    'use strict';
    
    // 高亮规则配置
    const HIGHLIGHT_RULES = [
        // 日期时间
        { pattern: /\d{4}-\d{2}-\d{2}/g, className: 'log-date' },
        { pattern: /\d{2}:\d{2}:\d{2}[.,]\d{3}/g, className: 'log-time' },
        
        // 日志级别（按优先级排序）
        { pattern: /\b(ERROR|FATAL|SEVERE)\b/gi, className: 'log-error' },
        { pattern: /\b(WARN|WARNING)\b/gi, className: 'log-warning' },
        { pattern: /\b(INFO|INFORMATION)\b/gi, className: 'log-info' },
        { pattern: /\b(DEBUG|TRACE|VERBOSE)\b/gi, className: 'log-debug' },
        
        // 异常类名
        { pattern: /\b[A-Z][a-zA-Z0-9]*Exception\b/g, className: 'log-exception' },
        { pattern: /\b[A-Z][a-zA-Z0-9]*Error\b/g, className: 'log-exception' },
        
        // IP 地址
        { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, className: 'log-ip' },
        
        // URL
        { pattern: /https?:\/\/[^\s]+/g, className: 'log-url' },
        
        // 字符串（引号包围）
        { pattern: /"[^"]*"/g, className: 'log-string' },
        { pattern: /'[^']*'/g, className: 'log-string' },
        
        // 数字
        { pattern: /\b\d+\b/g, className: 'log-number' }
    ];
    
    /**
     * 转义 HTML 特殊字符
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 对单行文本应用语法高亮
     * @param {string} line - 原始文本行
     * @returns {string} - 带高亮标记的 HTML
     */
    function highlightLine(line) {
        if (!line) return '';
        
        // 收集所有匹配项及其位置
        const matches = [];
        
        HIGHLIGHT_RULES.forEach(rule => {
            const regex = new RegExp(rule.pattern);
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    className: rule.className
                });
                
                // 防止无限循环
                if (match[0].length === 0) {
                    regex.lastIndex++;
                }
            }
        });
        
        // 按起始位置排序
        matches.sort((a, b) => a.start - b.start);
        
        // 去除重叠的匹配项（保留第一个）
        const filteredMatches = [];
        let lastEnd = 0;
        
        matches.forEach(match => {
            if (match.start >= lastEnd) {
                filteredMatches.push(match);
                lastEnd = match.end;
            }
        });
        
        // 构建高亮后的 HTML
        let result = '';
        let pos = 0;
        
        filteredMatches.forEach(match => {
            // 添加匹配前的普通文本
            if (match.start > pos) {
                result += escapeHtml(line.substring(pos, match.start));
            }
            
            // 添加高亮的匹配文本
            result += `<span class="${match.className}">${escapeHtml(match.text)}</span>`;
            pos = match.end;
        });
        
        // 添加剩余的普通文本
        if (pos < line.length) {
            result += escapeHtml(line.substring(pos));
        }
        
        return result;
    }
    
    /**
     * 对多行文本应用语法高亮
     * @param {string[]} lines - 文本行数组
     * @param {number} startLine - 起始行号（1-based）
     * @param {number} endLine - 结束行号（1-based）
     * @returns {string} - 完整的 HTML
     */
    function highlightLines(lines, startLine, endLine) {
        let html = '<div class="log-lines">';
        
        for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
            const lineNumber = i + 1;
            const lineContent = highlightLine(lines[i] || '');
            
            html += `
                <div class="log-line" data-line="${lineNumber}">
                    <span class="log-ln">${lineNumber}</span>
                    <span class="log-txt">${lineContent}</span>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    // 暴露到全局
    window.LogHighlighter = {
        highlightLine,
        highlightLines
    };
    
})();
